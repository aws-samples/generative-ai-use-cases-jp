import {
  BedrockAgentRuntimeClient,
  FlowInputContent,
  InvokeFlowCommand,
  InvokeFlowCommandInput,
  ServiceQuotaExceededException,
  ThrottlingException,
  ValidationException,
} from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockAgentRuntimeClient({
  region: process.env.MODEL_REGION,
});

type InvokeFlowGeneratorProps = {
  flowIdentifier: string;
  flowAliasIdentifier: string;
  document: FlowInputContent.DocumentMember['document'];
};

const bedrockFlowApi = {
  invokeFlow: async function* (props: InvokeFlowGeneratorProps) {
    const input: InvokeFlowCommandInput = {
      flowIdentifier: props.flowIdentifier,
      flowAliasIdentifier: props.flowAliasIdentifier,
      inputs: [
        {
          nodeName: 'FlowInputNode',
          nodeOutputName: 'document',
          content: {
            document: props.document,
          },
        },
      ],
    };

    const command = new InvokeFlowCommand(input);

    try {
      const response = await client.send(command);

      if (response.responseStream) {
        for await (const event of response.responseStream) {
          if (event.flowOutputEvent?.content?.document) {
            const chunk =
              event.flowOutputEvent.content.document.toString() + '\n';
            yield chunk;
          }

          if (event.flowCompletionEvent?.completionReason === 'SUCCESS') {
            break;
          }
        }
      }

      yield '\n';
    } catch (e) {
      if (
        e instanceof ThrottlingException ||
        e instanceof ServiceQuotaExceededException
      ) {
        yield 'ただいまアクセスが集中しているため時間をおいて試してみてください。';
      } else if (e instanceof ValidationException) {
        yield `形式エラーです。\n ${e}`;
      } else {
        console.error(e);
        yield 'エラーが発生しました。時間をおいて試してみてください。';
      }
    }
  },
};

export default bedrockFlowApi;
