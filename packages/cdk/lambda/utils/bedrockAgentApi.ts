import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
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
} from 'generative-ai-use-cases-jp';

const agentMap: AgentMap = JSON.parse(process.env.AGENT_MAP || '{}');
const client = new BedrockAgentRuntimeClient({
  region: process.env.AGENT_REGION,
});
const s3Client = new S3Client({});

const bedrockAgentApi: Partial<ApiInterface> = {
  invokeStream: async function* (model: Model, messages: UnrecordedMessage[]) {
    try {
      const command = new InvokeAgentCommand({
        agentId: agentMap[model.modelId].agentId,
        agentAliasId: agentMap[model.modelId].aliasId,
        sessionId: model.sessionId,
        enableTrace: true,
        inputText: messages[messages.length - 1].content,
      });
      const res = await client.send(command);

      if (!res.completion) {
        return;
      }

      for await (const streamChunk of res.completion) {
        if (streamChunk.chunk) {
          // Chunk の追加
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
              const [bucket, ...objectPath] = s3Uri.slice(5).split('/');
              const objectName = objectPath.join('/');
              const url = `https://${bucket}.s3.amazonaws.com/${objectName})`;

              // データソースがユニークであれば文末に Reference 追加
              if (sources[url] === undefined) {
                sources[url] = Object.keys(sources).length;
                body += `\n[^${sources[url]}]: ${url}`;
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
            yield body;
          }
        }

        // File の追加
        if (streamChunk.files) {
          for (const file of streamChunk.files.files || []) {
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
            const url = `https://${bucket}.s3.amazonaws.com/${key}`;

            // Yield file path
            if (file.type?.split('/')[0] === 'image') {
              yield `\n![${file.name}](${url})`;
            } else {
              yield `\n[${file.name}](${url})`;
            }
          }
        }
      }
    } catch (e) {
      if (
        e instanceof ThrottlingException ||
        e instanceof ServiceQuotaExceededException
      ) {
        yield 'ただいまアクセスが集中しているため時間をおいて試してみてください。';
      } else {
        console.error(e);
        yield 'エラーが発生しました。時間をおいて試してみてください。';
      }
    }
  },
};

export default bedrockAgentApi;
