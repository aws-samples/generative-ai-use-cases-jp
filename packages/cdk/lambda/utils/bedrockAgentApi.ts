import {
  BedrockAgentClient,
  GetAgentAliasCommand,
  ListAgentActionGroupsCommand,
} from '@aws-sdk/client-bedrock-agent';
import {
  BedrockAgentRuntimeClient,
  DependencyFailedException,
  InvokeAgentCommand,
  Parameter,
  ServiceQuotaExceededException,
  ThrottlingException,
} from '@aws-sdk/client-bedrock-agent-runtime';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiInterface,
  AgentMap,
  Model,
  UnrecordedMessage,
  BraveSearchResult,
} from 'generative-ai-use-cases-jp';
import { streamingChunk } from './streamingChunk';

const agentClient = new BedrockAgentClient({
  region: process.env.MODEL_REGION,
});
const agentRuntimeClient = new BedrockAgentRuntimeClient({
  region: process.env.MODEL_REGION,
});
const s3Client = new S3Client({});

// Agent の情報
const agentMap: AgentMap = JSON.parse(process.env.AGENT_MAP || '{}');
type AgentInfo = {
  codeInterpreterEnabled: boolean;
};
const agentInfoMap: { [aliasId: string]: AgentInfo } = {};

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

const getAgentInfo = async (agentId: string, agentAliasId: string) => {
  // Get Agent Info if not cached
  if (!agentInfoMap[agentAliasId]) {
    // Get Agent Version
    const agentAliasInfoRes = await agentClient.send(
      new GetAgentAliasCommand({
        agentId: agentId,
        agentAliasId: agentAliasId,
      })
    );
    const agentVersion =
      agentAliasInfoRes.agentAlias?.routingConfiguration?.pop()?.agentVersion ??
      '1';
    // List Action Group
    const actionGroups = await agentClient.send(
      new ListAgentActionGroupsCommand({
        agentId: agentId,
        agentVersion: agentVersion,
      })
    );
    // Cache Agent Info
    agentInfoMap[agentAliasId] = {
      codeInterpreterEnabled: !!actionGroups.actionGroupSummaries?.find(
        (actionGroup) => actionGroup.actionGroupName === 'CodeInterpreterAction'
      ),
    };
  }
  return agentInfoMap[agentAliasId];
};

const bedrockAgentApi: ApiInterface = {
  invoke: async () => {
    throw new Error('Not Implemented');
  },
  invokeStream: async function* (model: Model, messages: UnrecordedMessage[]) {
    try {
      // Get Agent
      if (!agentMap[model.modelId]) {
        throw new Error('Agent not found');
      }
      const agentId = agentMap[model.modelId].agentId;
      const agentAliasId = agentMap[model.modelId].aliasId;
      const agentInfo = await getAgentInfo(agentId, agentAliasId);

      // Invoke Agent
      const command = new InvokeAgentCommand({
        sessionState: {
          files:
            messages[messages.length - 1].extraData?.map((file) => ({
              name: file.name.replace(/[^a-zA-Z0-9\s\-()[\].]/g, 'X'), // ファイル名に日本語などが入っていると認識されないため置き換え
              source: {
                sourceType: 'BYTE_CONTENT',
                byteContent: {
                  mediaType: file.source.mediaType,
                  data: Buffer.from(file.source.data, 'base64'),
                },
              },
              useCase: agentInfo.codeInterpreterEnabled
                ? 'CODE_INTERPRETER'
                : 'CHAT',
            })) || [],
        },
        agentId: agentId,
        agentAliasId: agentAliasId,
        sessionId: model.sessionId,
        enableTrace: true,
        inputText: messages[messages.length - 1].content,
      });
      const res = await agentRuntimeClient.send(command);

      if (!res.completion) {
        return;
      }

      const existingFiles = new Set<string>();

      for await (const streamChunk of res.completion) {
        // Chunk
        if (streamChunk.chunk) {
          let body = new TextDecoder('utf-8').decode(streamChunk.chunk?.bytes);

          // Attribution の追加
          const sources: { [key: string]: number } = {};
          let offset = 0;
          for (const citation of streamChunk.chunk?.attribution?.citations ||
            []) {
            for (const ref of citation.retrievedReferences || []) {
              // S3 URI を取得し URL に変換
              const s3Uri = ref?.location?.s3Location?.uri || '';
              if (!s3Uri) continue;
              const url = convertS3UriToUrl(
                s3Uri,
                process.env.MODEL_REGION || ''
              );

              // ページ番号を取得
              const pageNumber =
                ref?.metadata?.['x-amz-bedrock-kb-document-page-number'];

              // ファイル名を取得してエンコード
              const fileName = url.split('/').pop() || '';
              const encodedFileName = encodeUrlString(fileName);

              // データソースがユニークであれば文末に Reference 追加
              if (sources[url] === undefined) {
                sources[url] = Object.keys(sources).length;
                body += `\n[^${sources[url]}]: [${fileName}${
                  pageNumber ? `(${pageNumber} ページ)` : ''
                }](${url.replace(fileName, encodedFileName)}${pageNumber ? `#page=${pageNumber}` : ''})`;
              }
              const referenceId = sources[url];

              // 文中に Reference 追加
              const position =
                (citation.generatedResponsePart?.textResponsePart?.span?.end ||
                  0) +
                offset +
                1;
              const referenceText = `[^${referenceId}]`;
              offset += referenceText.length;
              body =
                body.slice(0, position) + referenceText + body.slice(position);
            }
          }

          if (body) {
            yield streamingChunk({ text: body });
          }
        }

        // File
        // 画像は S3 にアップロードし画像として表示
        // ファイルは S3 にアップロードしリンクを表示
        if (streamChunk.files) {
          for (const file of streamChunk.files.files || []) {
            // 同じファイルが何度か出現することがあるため初出のみ表示
            if (existingFiles.has(file.name || '')) {
              continue;
            }
            existingFiles.add(file.name || '');

            // ファイルを S3 にアップロード
            const uuid = uuidv4();
            const bucket = process.env.BUCKET_NAME;
            const key = `${uuid}/${file.name}`;
            const command = new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: file.bytes,
            });
            await s3Client.send(command);
            const url = `https://${bucket}.s3.amazonaws.com/${encodeUrlString(key)}`;

            // Yield file path
            if (file.type?.split('/')[0] === 'image') {
              yield streamingChunk({ text: `\n![${file.name}](${url})` });
            } else {
              yield streamingChunk({ text: `\n[${file.name}](${url})` });
            }
          }
        }

        // Trace
        if (streamChunk.trace && streamChunk.trace.trace?.orchestrationTrace) {
          let trace: string = '';
          const rationale =
            streamChunk.trace.trace?.orchestrationTrace.rationale;
          const invocationInput =
            streamChunk.trace.trace?.orchestrationTrace.invocationInput;
          const observation =
            streamChunk.trace.trace?.orchestrationTrace.observation;

          if (rationale?.text) {
            // 思考過程はそのまま表示
            trace = rationale.text;
          } else if (invocationInput) {
            // Action への入力
            if (invocationInput.codeInterpreterInvocationInput?.code) {
              // CodeInterpreter への入力は Python コードをブロックで表示
              trace =
                '```python' +
                invocationInput.codeInterpreterInvocationInput.code +
                '\n```';
            } else if (
              invocationInput.actionGroupInvocationInput?.actionGroupName
            ) {
              // カスタムアクション
              // 自前のアクションを呼び出す時は必要に応じてここを編集
              if (
                invocationInput.actionGroupInvocationInput.actionGroupName ===
                'Search'
              ) {
                // 検索エージェントは検索キーワードを表示
                const content =
                  invocationInput.actionGroupInvocationInput.requestBody
                    ?.content || {};
                const parameters: Parameter[] | undefined =
                  content['application/json'];
                trace =
                  invocationInput.actionGroupInvocationInput.actionGroupName +
                  ': ' +
                  parameters?.map((item) => item.value).join(' ');
              } else {
                // それ以外は Action Group 名のみ表示。
                trace =
                  invocationInput.actionGroupInvocationInput.actionGroupName;
              }
            } else if (invocationInput.knowledgeBaseLookupInput?.text) {
              // Knowledge Base は検索キーワードを表示
              trace =
                'Search: ' + invocationInput.knowledgeBaseLookupInput.text;
            }
          } else if (observation) {
            // Action からの出力
            if (observation.codeInterpreterInvocationOutput?.executionOutput) {
              // CodeInterpreter の出力（Python の stdout）はそのまま表示
              trace =
                observation.codeInterpreterInvocationOutput.executionOutput;
            } else if (observation.actionGroupInvocationOutput?.text) {
              // カスタムアクション
              // 自前のアクションを呼び出す時は必要に応じてここを編集
              const output = observation.actionGroupInvocationOutput.text;
              if (output.startsWith('<search_results>')) {
                // 検索エージェントはタイトルと URL を表示
                const searchResult: BraveSearchResult[] = JSON.parse(
                  output
                    .replace('<search_results>', '')
                    .replace('</search_results>', '')
                );
                trace = searchResult
                  .map((item) => `- [${item.title}](${item.url})`)
                  .join('\n');
              } else {
                // それ以外は出力の冒頭1000文字を表示
                trace =
                  output.length > 1000 ? output.slice(0, 1000) + '...' : output;
              }
            } else if (
              observation.knowledgeBaseLookupOutput?.retrievedReferences
            ) {
              // Knowledge Base はソース URL を表示
              const refs =
                observation.knowledgeBaseLookupOutput.retrievedReferences?.flatMap(
                  (ref) => {
                    const location = Object.values(ref.location || {}).find(
                      (loc) => loc?.uri || loc?.url
                    );
                    if (location) {
                      const url = location.uri
                        ? convertS3UriToUrl(
                            location.uri,
                            process.env.MODEL_REGION || ''
                          )
                        : location.url;
                      const fileName = url.split('/').pop() || '';
                      const encodedFileName = encodeUrlString(fileName);
                      const pageNumber =
                        ref?.metadata?.[
                          'x-amz-bedrock-kb-document-page-number'
                        ];

                      return `- [${fileName}${
                        pageNumber ? `(${pageNumber} ページ)` : ''
                      }](${url.replace(fileName, encodedFileName)}${pageNumber ? `#page=${pageNumber}` : ''})`;
                    }
                    return [];
                  }
                );
              trace = Array.from(new Set(refs)).join('\n');
            }
          }
          // Markdown を正しく動作させるための改行
          yield streamingChunk({ text: '', trace: trace + '\n' });
        }
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

export default bedrockAgentApi;
