import { Handler } from 'aws-lambda';
import { SageMakerRuntimeClient, InvokeEndpointWithResponseStreamCommand } from "@aws-sdk/client-sagemaker-runtime";
import { PredictRequest } from 'generative-ai-use-cases-jp';
import { Configuration, OpenAIApi } from 'openai';
import { IncomingMessage } from 'http';
import { fetchOpenApiKey } from './secret';
import { messages_to_prompt } from './prompter';

declare global {
  namespace awslambda {
    function streamifyResponse(
      f: (
        event: PredictRequest,
        responseStream: NodeJS.WritableStream
      ) => Promise<void>
    ): Handler;
  }
}

export const handler = awslambda.streamifyResponse(
  async (event, responseStream) => {
    if (process.env.MODEL_TYPE == "bedrock") {
      // Bedrock
      responseStream.write("Implementation for Bedrock is coming soon.");
    } else if (process.env.MODEL_TYPE == "sagemaker") {
      // SageMaker Huggingface TGI
      // SageMaker Runtime Client の初期化
      const client = new SageMakerRuntimeClient({ region: process.env.MODEL_REGION });

      // SageMaker API を使用してチャットの応答を取得
      const command = new InvokeEndpointWithResponseStreamCommand({
        EndpointName: process.env.MODEL_NAME,
        Body: JSON.stringify({
          inputs: messages_to_prompt(event.messages),
          parameters: {
            max_new_tokens: 512,
            return_full_text: false,
            do_sample: true,
            temperature: 0.3
          },
          stream: true
        }),
        ContentType: "application/json",
        Accept: "application/json"
      });
      const stream = (await client.send(command)).Body;
      if (!stream) return

      let buffer = "";
      for await (const chunk of stream) {
        buffer += new TextDecoder().decode(chunk.PayloadPart?.Bytes)
        if (!buffer.endsWith("\n")) continue

        // When buffer end with \n it can be parsed
        const lines: string[] = buffer
          .split('\n')
          .filter((line: string) => line.trim().startsWith('data:')) || [];
        for (const line of lines) {
          const message = line.replace(/^data:/, '');
          const token: string = JSON.parse(message).token.text || "";
          if (!token.includes("</s>")) responseStream.write(token);
        }
        buffer = "";
      }
    } else {
      // OpenAI
      // Secret 情報の取得
      const apiKey = await fetchOpenApiKey();

      // OpenAI API の初期化
      const configuration = new Configuration({ apiKey });
      const openai = new OpenAIApi(configuration);

      // OpenAI API を使用してチャットの応答を取得
      const chatCompletion = await openai.createChatCompletion(
        {
          model: 'gpt-3.5-turbo',
          messages: event.messages,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      const stream = chatCompletion.data as unknown as IncomingMessage;

      for await (const chunk of stream) {
        const lines: string[] = chunk
          .toString('utf8')
          .split('\n')
          .filter((line: string) => line.trim().startsWith('data: '));

        for (const line of lines) {
          const message = line.replace(/^data: /, '');

          if (message === '[DONE]') {
            break;
          }

          const json = JSON.parse(message);
          const token: string | undefined = json.choices[0].delta.content;

          if (token) {
            responseStream.write(token);
          }
        }
      }
    }

    responseStream.end();
  }
);
