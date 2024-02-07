import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  ServiceQuotaExceededException,
  ThrottlingException,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { ApiInterface, AgentMap } from 'generative-ai-use-cases-jp';

const agentMap: AgentMap = JSON.parse(process.env.AGENT_MAP || '{}');
const client = new BedrockAgentRuntimeClient({
  region: process.env.AGENT_REGION,
});

const bedrockAgentApi: Partial<ApiInterface> = {
  invokeStream: async function* (model, messages) {
    try {
      const command = new InvokeAgentCommand({
        sessionId: model.sessionId,
        inputText: messages[messages.length - 1].content,
        agentId: agentMap[model.modelId].agentId,
        agentAliasId: agentMap[model.modelId].aliasId,
      });
      const res = await client.send(command);

      if (!res.completion) {
        return;
      }

      for await (const streamChunk of res.completion) {
        if (!streamChunk.chunk?.bytes) {
          break;
        }
        const body = new TextDecoder('utf-8').decode(streamChunk.chunk?.bytes);
        if (body) {
          yield body;
        }
        if (body) {
          break;
        }
      }
    } catch (e) {
      if (
        e instanceof ThrottlingException ||
        e instanceof ServiceQuotaExceededException
      ) {
        yield 'ただいまアクセスが集中しているため時間をおいて試してみてください。';
      } else {
        yield 'エラーが発生しました。時間をおいて試してみてください。';
      }
    }
  },
};

export default bedrockAgentApi;
