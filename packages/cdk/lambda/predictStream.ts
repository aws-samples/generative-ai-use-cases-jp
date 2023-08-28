import { Context, Handler } from 'aws-lambda';
import { PredictRequest } from 'generative-ai-use-cases-jp';
import { Configuration, OpenAIApi } from 'openai';
import { IncomingMessage } from 'http';
import { fetchOpenApiKey } from './secret';

declare global {
  namespace awslambda {
    function streamifyResponse(
      f: (
        event: PredictRequest,
        responseStream: NodeJS.WritableStream,
        context: Context
      ) => Promise<void>
    ): Handler;
  }
}

export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
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

    responseStream.end();
  }
);
