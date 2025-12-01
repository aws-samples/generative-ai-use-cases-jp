/*
 * TODO: 現状の問題点
 * - StreamingのStopReasonが応答終了以外に対応していない
 * - S3からの入力に対応していない（どこで使っているのかが分からない）
 */
import {
  Model,
  UnrecordedMessage,
  ApiInterface,
  GenerateImageParams,
  GenerateVideoParams,
  ExtraData,
} from 'generative-ai-use-cases';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';
import { streamingChunk } from './streamingChunk';
import { StopReason } from '@aws-sdk/client-bedrock-runtime';
import { initChatModel } from 'langchain/chat_models/universal';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream-node';

/**
 * S3からファイルを取得してBase64形式で返す
 * @param extraData 対象のデータ
 * @returns Base64形式のデータ
 */
const getS3FileAsBase64 = async (extraData: ExtraData): Promise<string> => {
  console.debug('Get data from S3');

  const s3Client = new S3Client();

  const command = new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: extraData.source.data,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('No body in response');
  }

  // SdkStreamMixinを使用してStreamを変換
  const sdkStream = sdkStreamMixin(response.Body);
  const data = await sdkStream.transformToByteArray();

  // Uint8ArrayをBase64に変換
  const base64String = Buffer.from(data).toString('base64');

  return base64String;
};

/**
 * ExtraDataがS3のURLを指していたときにBase64形式に変換してくれるヘルパー
 * @param extraData 対象のデータ
 * @returns Base64あるいはText形式のデータ
 */
const getTextDataFromExtraData = async (
  extraData: ExtraData
): Promise<string> => {
  if (extraData.source.type === 's3') {
    // S3に保存されている場合はデータを取得してBase64に変換して返す
    return await getS3FileAsBase64(extraData);
  }

  return extraData.source.data;
};

/**
 * OpenAI互換のimage_url形式のコンテンツブロック
 * LiteLLMが全プロバイダー(OpenAI, Anthropic, Bedrock, Vertex AI等)に正しく変換する
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
 * サポートするコンテンツブロックの型
 */
type SupportedContentBlock = ImageUrlContentBlock | TextContentBlock;

/**
 * ExtraDataをLangChain用のコンテンツブロックに変換する
 * OpenAI互換のimage_url形式を使用することで、LiteLLMが全プロバイダー
 * (OpenAI, Anthropic, Bedrock, Vertex AI等)に正しく変換できる
 * @param extraData 対象のデータ
 * @returns LangChain用のコンテンツブロック
 */
const convertExtraData = async (
  extraData: ExtraData
): Promise<SupportedContentBlock> => {
  const { type: dataType, source } = extraData;
  const { type: sourceType, mediaType } = source;

  const data = await getTextDataFromExtraData(extraData);

  if (sourceType === 'json') {
    return {
      type: 'text',
      text: data,
    };
  }

  switch (dataType) {
    case 'image':
      // OpenAI互換のimage_url形式を使用（LiteLLMが全プロバイダーに変換）
      return {
        type: 'image_url',
        image_url: {
          url: `data:${mediaType};base64,${data}`,
        },
      };
    case 'file':
      // ファイルもimage_url形式で送信（PDFなどのドキュメントも対応）
      return {
        type: 'image_url',
        image_url: {
          url: `data:${mediaType};base64,${data}`,
        },
      };
    case 'json':
      return {
        type: 'text',
        text: data,
      };
    case 'video':
      throw new Error('Video input is not supported currently.');
  }
};

/**
 * Bedrock用のUnrecordedMessageをLangChain用のHumanMessageにいい感じに変換する
 * @param message Bedrock用のメッセージ
 * @returns LangChain用のHumanMessage
 */
const convertToHumanMessage = async (message: UnrecordedMessage) => {
  if (message.extraData) {
    const extraContents = await Promise.all(
      message.extraData.map(async (data) => await convertExtraData(data))
    );

    return new HumanMessage({
      content: [
        {
          type: 'text',
          text: message.content,
        },
        ...extraContents,
      ],
    });
  }
  return new HumanMessage(message.content);
};

/**
 * Bedrock用のメッセージをLangChain用のメッセージに変換してくれる
 * @param message Bedrock用のメッセージ
 * @returns LangChain用のメッセージ
 */
const convertSingleMessage = async (message: UnrecordedMessage) => {
  switch (message.role) {
    case 'system':
      return new SystemMessage(message.content);
    case 'user':
      return await convertToHumanMessage(message);
    case 'assistant':
      return new AIMessage(message.content);
  }
};

/**
 * Bedrock用の会話履歴をLangChain用の会話履歴にいい感じに変換してくれる
 * @param messages Bedrock用の会話履歴
 * @returns LangChain用の会話履歴
 */
const convertMessages = (messages: UnrecordedMessage[]) => {
  return Promise.all(
    messages.map(async (message) => await convertSingleMessage(message))
  );
};

const langchainApi: ApiInterface = {
  invoke: async function (
    model: Model,
    messages: UnrecordedMessage[],
    id: string
  ): Promise<string> {
    const llm = await initChatModel(model.modelId);
    const langchainMessages = await convertMessages(messages);

    console.debug(JSON.stringify(messages));

    const response = await llm.invoke(langchainMessages);

    return response.text;
  },
  invokeStream: async function* (
    model: Model,
    messages: UnrecordedMessage[],
    id: string,
    idToken?: string | undefined
  ): AsyncIterable<string> {
    const llm = await initChatModel(model.modelId);
    const langchainMessages = await convertMessages(messages);

    console.debug(JSON.stringify(messages));

    const stream = await llm.stream(langchainMessages);

    for await (const chunk of stream) {
      yield streamingChunk({
        text: chunk.text,
      });
    }

    yield streamingChunk({
      text: '',
      stopReason: StopReason.END_TURN,
    });
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

export default langchainApi;
