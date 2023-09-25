import { UnrecordedMessage } from 'generative-ai-use-cases-jp';
import { Configuration, OpenAIApi } from 'openai';
import { fetchOpenApiKey } from './secret';
import { IncomingMessage } from 'http';

const invoke = async (messages: UnrecordedMessage[]): Promise<string> => {
  // OpenAI
  // Secret 情報の取得
  const apiKey = await fetchOpenApiKey();

  // OpenAI API の初期化
  const configuration = new Configuration({ apiKey });
  const openai = new OpenAIApi(configuration);

  // OpenAI API を使用してチャットの応答を取得
  const chatCompletion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: messages,
  });

  return chatCompletion.data.choices[0].message!.content!;
};

async function* invokeStream(
  messages: UnrecordedMessage[]
): AsyncIterable<string> {
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
      messages: messages,
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
        yield token;
      }
    }
  }
}

export default {
  invoke,
  invokeStream,
};
