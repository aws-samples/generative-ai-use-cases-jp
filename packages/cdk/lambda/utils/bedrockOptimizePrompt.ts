import {
  BedrockAgentRuntimeClient,
  ServiceQuotaExceededException,
  ThrottlingException,
  ValidationException,
  OptimizePromptCommandInput,
  OptimizePromptCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { OptimizePromptRequest } from 'generative-ai-use-cases-jp';

const client = new BedrockAgentRuntimeClient({
  region: process.env.MODEL_REGION,
});

const bedrockOptimizePrompt = {
  execute: async function* (props: OptimizePromptRequest) {
    const input: OptimizePromptCommandInput = {
      input: {
        textPrompt: {
          text: props.prompt,
        },
      },
      targetModelId: props.targetModelId,
    };

    const command = new OptimizePromptCommand(input);

    try {
      const response = await client.send(command);

      if (response.optimizedPrompt) {
        for await (const event of response.optimizedPrompt) {
          if (!event) {
            break;
          }

          if (event.optimizedPromptEvent?.optimizedPrompt?.textPrompt?.text) {
            const chunk =
              event.optimizedPromptEvent?.optimizedPrompt?.textPrompt?.text;
            yield chunk;
          }

          if (event.analyzePromptEvent?.message) {
            // 現状何もしない
          }
        }
      }
    } catch (e) {
      if (
        e instanceof ThrottlingException ||
        e instanceof ServiceQuotaExceededException
      ) {
        // 以下全て OptimizePrompt のレスポンスに合わせて JSON.stringify する
        yield JSON.stringify(
          'ただいまアクセスが集中しているため時間をおいて試してみてください。'
        );
      } else if (e instanceof ValidationException) {
        yield JSON.stringify(`利用上限に達したか不正なリクエストです \n ${e}`);
      } else {
        console.error(e);
        yield JSON.stringify(
          'エラーが発生しました。時間をおいて試してみてください。'
        );
      }
    }
  },
};

export default bedrockOptimizePrompt;
