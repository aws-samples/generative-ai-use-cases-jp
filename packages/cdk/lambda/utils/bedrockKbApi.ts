import {
  BedrockAgentRuntimeClient,
  DependencyFailedException,
  ImplicitFilterConfiguration,
  OrchestrationConfiguration,
  RetrievalFilter,
  RetrieveAndGenerateStreamCommand,
  RetrievedReference,
  ServiceQuotaExceededException,
  ThrottlingException,
  VectorSearchRerankingConfiguration,
} from '@aws-sdk/client-bedrock-agent-runtime';

import {
  ApiInterface,
  Model,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';
import {
  implicitFilters,
  hiddenStaticExplicitFilters,
  getDynamicFilters,
} from '@generative-ai-use-cases-jp/common';
import { streamingChunk } from './streamingChunk';
import { verifyToken } from './auth';

const agentRuntimeClient = new BedrockAgentRuntimeClient({
  region: process.env.MODEL_REGION,
});

// s3://<BUCKET>/<PREFIX> から https://s3.<REGION>.amazonaws.com/<BUCKET>/<PREFIX> に変換する
const convertS3UriToUrl = (s3Uri: string, region: string): string => {
  const result = /^s3:\/\/(?<bucketName>.+?)\/(?<prefix>.+)/.exec(s3Uri);
  if (result) {
    const groups = result?.groups as {
      bucketName: string;
      prefix: string;
    };
    return `https://s3.${region}.amazonaws.com/${groups.bucketName}/${groups.prefix}`;
  }
  return '';
};

// 文字列をURL-encodeする
const encodeUrlString = (str: string): string => {
  try {
    return encodeURIComponent(str);
  } catch (e) {
    console.error('Failed to URL-encode string:', e);
    return str;
  }
};

const getImplicitFilters = (): ImplicitFilterConfiguration | undefined => {
  // Currently only supports Claude 3.5 Sonnet
  const modelId = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

  if (implicitFilters.length === 0) {
    return undefined;
  } else {
    return {
      metadataAttributes: implicitFilters,
      modelArn: `arn:aws:bedrock:${process.env.MODEL_REGION}::foundation-model/${modelId}`,
    };
  }
};

const getExplicitFilters = async (
  messages: UnrecordedMessage[],
  idToken?: string
): Promise<RetrievalFilter | undefined> => {
  // Check id token valid
  const payload = await verifyToken(idToken || '');
  if (!payload) {
    return undefined;
  }

  // ===== Dynamic Filter =====
  const dynamicFilters: RetrievalFilter[] = getDynamicFilters(payload);

  // ===== Get User Defined Explicit Filters =====
  let userDefinedExplicitFilters: RetrievalFilter[] = [];
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.extraData) {
    userDefinedExplicitFilters = lastMessage.extraData
      .filter((extra) => extra.type === 'json')
      .map((extra) => JSON.parse(extra.source.data) as RetrievalFilter);
  }

  // Return aggregated filters
  const aggregatedFilters: RetrievalFilter[] = [
    ...hiddenStaticExplicitFilters,
    ...dynamicFilters,
    ...userDefinedExplicitFilters,
  ];
  if (aggregatedFilters.length === 0) {
    return undefined;
  } else if (aggregatedFilters.length === 1) {
    return aggregatedFilters[0];
  } else {
    return {
      andAll: aggregatedFilters,
    };
  }
};

const getRerankingConfig = ():
  | VectorSearchRerankingConfiguration
  | undefined => {
  if (!process.env.RERANKING_MODEL_ID) return undefined;
  return {
    type: 'BEDROCK_RERANKING_MODEL',
    bedrockRerankingConfiguration: {
      modelConfiguration: {
        modelArn: `arn:aws:bedrock:${process.env.MODEL_REGION}::foundation-model/${process.env.RERANKING_MODEL_ID}`,
      },
    },
  };
};

const getOrchestrationConfig = (): OrchestrationConfiguration | undefined => {
  if (!process.env.QUERY_DECOMPOSITION_ENABLED) return undefined;
  return {
    queryTransformationConfiguration: {
      type: 'QUERY_DECOMPOSITION',
    },
  };
};

const bedrockKbApi: ApiInterface = {
  invoke: async () => {
    throw new Error('Not Implemented');
  },
  invokeStream: async function* (
    model: Model,
    messages: UnrecordedMessage[],
    id: string,
    idToken?: string
  ) {
    try {
      // Get explicit filters (async since it may require idToken verification)
      const explicitFilters = await getExplicitFilters(messages, idToken);

      // Invoke
      const command = new RetrieveAndGenerateStreamCommand({
        input: {
          text: messages[messages.length - 1].content,
        },
        sessionId: model.sessionId,
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
            modelArn: model.modelId,
            retrievalConfiguration: {
              vectorSearchConfiguration: {
                // Filter
                filter: explicitFilters,
                // Implicit Filter
                implicitFilterConfiguration: getImplicitFilters(),
                // Rerank
                rerankingConfiguration: getRerankingConfig(),
              },
            },
            // Query Splitting
            orchestrationConfiguration: getOrchestrationConfig(),
          },
        },
      });
      const res = await agentRuntimeClient.send(command);

      if (res.sessionId) {
        yield streamingChunk({ text: '', sessionId: res.sessionId });
      }

      if (!res.stream) {
        return;
      }

      // Store Reference
      const sources: {
        [key: string]: {
          refId: number;
          ref: RetrievedReference;
          fileName: string;
          pageNumber?: string;
        };
      } = {};

      // Citation が数文字あとに渡されることがあるため、10文字ほどバッファを設けて Citation を差し込む余裕を持たせる。
      let buffer = '';
      let currentPosition = 0;

      for await (const streamChunk of res.stream) {
        // Chunk
        if (streamChunk.output?.text) {
          const body = streamChunk.output?.text;
          buffer += body;
          const newPosition = Math.max(0, currentPosition, buffer.length - 10);
          yield streamingChunk({
            text: buffer.slice(currentPosition, newPosition),
          });
          currentPosition = newPosition;
        } else if (streamChunk.citation?.citation) {
          // Citation end までバッファを進める
          const newPosition =
            (streamChunk.citation.citation.generatedResponsePart
              ?.textResponsePart?.span?.end || 0) + 1;
          if (newPosition <= buffer.length) {
            yield streamingChunk({
              text: buffer.slice(currentPosition, newPosition),
            });
            currentPosition = newPosition;
          }

          // Reference を差し込む
          for (const ref of streamChunk.citation.citation.retrievedReferences ||
            []) {
            // S3 URI を取得し URL に変換
            const s3Uri = ref?.location?.s3Location?.uri || '';
            if (!s3Uri) continue;
            const url = convertS3UriToUrl(
              s3Uri,
              process.env.MODEL_REGION || ''
            );

            // ページ番号を取得
            const pageNumber = ref?.metadata?.[
              'x-amz-bedrock-kb-document-page-number'
            ] as string | undefined;

            // Get File name
            const fileName = url.split('/').pop() || '';
            const encodedFileName = encodeUrlString(fileName);

            // Build URL including page number for PDF
            const refUrl = `${url.replace(fileName, encodedFileName)}${pageNumber ? `#page=${pageNumber}` : ''}`;

            // データソースがユニークであれば Reference 追加
            if (sources[refUrl] === undefined) {
              sources[refUrl] = {
                refId: Object.keys(sources).length,
                ref: ref,
                fileName: fileName,
                pageNumber: pageNumber,
              };
            }
            // Reference の参照番号を追加
            const body = `[^${sources[refUrl].refId}]`;
            yield streamingChunk({ text: body });
          }
        }
      }
      // 最後まで出力
      if (buffer.length > currentPosition) {
        yield streamingChunk({ text: buffer.slice(currentPosition) });
        currentPosition = buffer.length;
      }
      // 文末に Reference 追加
      for (const [url, { refId, ref, fileName, pageNumber }] of Object.entries(
        sources
      )) {
        const referenceText = `\n[^${refId}]: [${ref.metadata?.['title'] || fileName}${
          pageNumber ? `(${pageNumber} ページ)` : ''
        }](${url})`;

        yield streamingChunk({ text: referenceText });
      }
    } catch (e) {
      if (
        e instanceof ThrottlingException ||
        e instanceof ServiceQuotaExceededException
      ) {
        yield streamingChunk({
          text: 'ただいまアクセスが集中しているため時間をおいて試してみてください。',
          stopReason: 'error',
        });
      } else if (e instanceof DependencyFailedException) {
        const modelAccessURL = `https://${process.env.MODEL_REGION}.console.aws.amazon.com/bedrock/home?region=${process.env.MODEL_REGION}#/modelaccess`;
        yield streamingChunk({
          text: `選択したモデルが有効化されていないようです。[Bedrock コンソールの Model Access 画面](${modelAccessURL})にて、利用したいモデルを有効化してください。`,
          stopReason: 'error',
        });
      } else {
        console.error(e);
        yield streamingChunk({
          text:
            'エラーが発生しました。管理者に以下のエラーを報告してください。\n' +
            e,
          stopReason: 'error',
        });
      }
    }
  },
  generateImage: async () => {
    throw new Error('Not Implemented');
  },
  generateVideo: async () => {
    throw new Error('Not Implemented');
  },
};

export default bedrockKbApi;
