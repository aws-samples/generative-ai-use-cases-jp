import {
  ApiInterface,
  ExtraData,
  GenerateImageParams,
  GenerateVideoParams,
  Model,
  UnrecordedMessage,
} from 'generative-ai-use-cases';
import { streamingChunk } from './streamingChunk';
import { StopReason } from '@aws-sdk/client-bedrock-runtime';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream-node';

/**
 * OpenAI互換のimage_url形式のコンテンツブロック
 */
interface ImageUrlContentBlock {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

/**
 * テキスト形式のコンテンツブロック
 */
interface TextContentBlock {
  type: 'text';
  text: string;
}

/**
 * OpenAI互換のメッセージコンテンツ型
 */
type OpenAIMessageContent =
  | string
  | Array<TextContentBlock | ImageUrlContentBlock>;

/**
 * OpenAI互換のメッセージ型
 */
interface OpenAIMessage {
  role: string;
  content: OpenAIMessageContent;
}

/**
 * S3からファイルを取得してBase64形式で返す
 */
const getS3FileAsBase64 = async (extraData: ExtraData): Promise<string> => {
  const s3Client = new S3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: extraData.source.data,
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error('No body in response');
  }

  const sdkStream = sdkStreamMixin(response.Body);
  const data = await sdkStream.transformToByteArray();
  return Buffer.from(data).toString('base64');
};

/**
 * ExtraDataからデータを取得
 */
const getDataFromExtraData = async (extraData: ExtraData): Promise<string> => {
  if (extraData.source.type === 's3') {
    return await getS3FileAsBase64(extraData);
  }
  return extraData.source.data;
};

/**
 * ExtraDataをOpenAI互換のimage_url形式に変換
 * LiteLLMが全プロバイダー(OpenAI, Anthropic, Bedrock, Vertex AI等)に正しく変換する
 */
const convertExtraDataToContentBlock = async (
  extraData: ExtraData
): Promise<ImageUrlContentBlock | TextContentBlock> => {
  const { type: dataType, source } = extraData;
  const { type: sourceType, mediaType } = source;

  const data = await getDataFromExtraData(extraData);

  // JSONデータはテキストとして扱う
  if (sourceType === 'json' || dataType === 'json') {
    return {
      type: 'text',
      text: data,
    };
  }

  // 画像、ファイル（PDF等）はimage_url形式で送信
  // LiteLLMがプロバイダーごとに適切な形式に変換する
  switch (dataType) {
    case 'image':
    case 'file':
      return {
        type: 'image_url',
        image_url: {
          url: `data:${mediaType};base64,${data}`,
        },
      };
    case 'video':
      throw new Error('Video input is not supported currently.');
    default:
      return {
        type: 'text',
        text: data,
      };
  }
};

/**
 * UnrecordedMessageをOpenAI互換形式に変換
 * extraDataがある場合はマルチモーダルコンテンツとして構築
 */
const createOpenAIChatCompletionMessages = async (
  messages: UnrecordedMessage[]
): Promise<OpenAIMessage[]> => {
  return Promise.all(
    messages.map(async (message) => {
      // extraDataがない場合は単純なテキストメッセージ
      if (!message.extraData || message.extraData.length === 0) {
        return {
          role: message.role,
          content: message.content,
        };
      }

      // extraDataがある場合はマルチモーダルコンテンツを構築
      const contentBlocks: Array<TextContentBlock | ImageUrlContentBlock> = [
        {
          type: 'text',
          text: message.content,
        },
      ];

      for (const extra of message.extraData) {
        const block = await convertExtraDataToContentBlock(extra);
        contentBlocks.push(block);
      }

      return {
        role: message.role,
        content: contentBlocks,
      };
    })
  );
};

const convertFinishReason = (
  reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call'
) => {
  switch (reason) {
    case 'stop':
      return StopReason.STOP_SEQUENCE;
    case 'length':
      return StopReason.MAX_TOKENS;
    case 'tool_calls':
    case 'function_call':
      return StopReason.TOOL_USE;
    case 'content_filter':
      return StopReason.CONTENT_FILTERED;
    default:
      return 'error';
  }
};

interface ChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  stream: boolean;
}

const createSignedRequest = async (
  endpoint: string,
  body: ChatCompletionRequest
) => {
  const url = new URL(endpoint);
  const hostname = url.hostname;
  const pathname = url.pathname.endsWith('/')
    ? url.pathname + 'chat/completions'
    : url.pathname + '/chat/completions';

  const request = new HttpRequest({
    hostname,
    path: pathname,
    method: 'POST',
    headers: {
      host: hostname,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const credentials = await defaultProvider();
  const signer = new SignatureV4({
    credentials,
    region: process.env.AWS_REGION || 'us-east-1',
    service: 'lambda',
    sha256: Sha256,
  });

  const signedRequest = await signer.sign(request);
  return signedRequest;
};

const liteLlmApi: ApiInterface = {
  invoke: async function (
    model: Model,
    messages: UnrecordedMessage[],

    id: string
  ): Promise<string> {
    const litellmEndpoint = process.env.LITELLM_ENDPOINT;

    if (!litellmEndpoint) {
      throw new Error('LITELLM_ENDPOINT environment variable is not set');
    }

    const openAIMessages = await createOpenAIChatCompletionMessages(messages);
    const requestBody = {
      model: model.modelId,
      messages: openAIMessages,
      stream: false,
    };

    const signedRequest = await createSignedRequest(
      litellmEndpoint,
      requestBody
    );

    const fullUrl = litellmEndpoint.endsWith('/')
      ? litellmEndpoint + 'chat/completions'
      : litellmEndpoint + '/chat/completions';

    const response = await fetch(fullUrl, {
      method: signedRequest.method,
      headers: signedRequest.headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LiteLLM API request failed: ${response.status} - ${errorText}`
      );
    }

    const completion = await response.json();
    return completion.choices[0].message.content ?? '';
  },
  invokeStream: async function* (
    model: Model,
    messages: UnrecordedMessage[],

    id: string,

    idToken?: string | undefined
  ): AsyncIterable<string> {
    const litellmEndpoint = process.env.LITELLM_ENDPOINT;

    if (!litellmEndpoint) {
      throw new Error('LITELLM_ENDPOINT environment variable is not set');
    }

    const openAIMessages = await createOpenAIChatCompletionMessages(messages);
    const requestBody = {
      model: model.modelId,
      messages: openAIMessages,
      stream: true,
    };

    const signedRequest = await createSignedRequest(
      litellmEndpoint,
      requestBody
    );

    const fullUrl = litellmEndpoint.endsWith('/')
      ? litellmEndpoint + 'chat/completions'
      : litellmEndpoint + '/chat/completions';

    const response = await fetch(fullUrl, {
      method: signedRequest.method,
      headers: signedRequest.headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LiteLLM API request failed: ${response.status} - ${errorText}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          const decodedChunk = decoder.decode(value, { stream: true });
          buffer += decodedChunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;

            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                yield streamingChunk({
                  text: '',
                  stopReason: StopReason.STOP_SEQUENCE,
                });
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const choice = parsed.choices?.[0];

                if (choice?.finish_reason) {
                  const stopReason = convertFinishReason(choice.finish_reason);
                  yield streamingChunk({
                    text: '',
                    stopReason: stopReason,
                  });
                } else if (choice?.delta?.content) {
                  yield streamingChunk({
                    text: choice.delta.content,
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
  generateImage: function (
    model: Model,

    params: GenerateImageParams
  ): Promise<string> {
    throw new Error('Function not implemented.');
  },
  generateVideo: function (
    model: Model,

    params: GenerateVideoParams
  ): Promise<string> {
    throw new Error('Function not implemented.');
  },
};

export default liteLlmApi;
