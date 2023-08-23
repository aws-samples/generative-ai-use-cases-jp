import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Configuration, OpenAIApi } from 'openai';
import { PredictRequest, ShownMessage } from 'generative-ai-use-cases-jp';
import { fetchOpenApiKey } from './secret';
import { recordMessage } from './repository';

const omitUnusedProperties = (messages: ShownMessage[]) => {
  return messages.map((m) => {
    return {
      role: m.role,
      content: m.content,
    };
  });
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: PredictRequest = JSON.parse(event.body!);
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];

    let predictedMessages: ShownMessage[] = [];

    if (req.skipRecording) {
      predictedMessages = req.unrecordedMessages;
    } else {
      for (const m of req.unrecordedMessages) {
        predictedMessages.push(await recordMessage(m, userId, req.chatId!));
      }
    }

    // Secret 情報の取得
    const apiKey = await fetchOpenApiKey();

    // OpenAI API の初期化
    const configuration = new Configuration({ apiKey });
    const openai = new OpenAIApi(configuration);

    // OpenAI API を使用してチャットの応答を取得
    const chatCompletion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: omitUnusedProperties(
        (req.recordedMessages as ShownMessage[]).concat(predictedMessages)
      ),
    });

    let assistantMessage: ShownMessage = {
      role: 'assistant',
      content: chatCompletion.data.choices[0].message?.content!,
    };

    if (!req.skipRecording) {
      assistantMessage = await recordMessage(
        assistantMessage,
        userId,
        req.chatId!
      );
    }

    predictedMessages.push(assistantMessage);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ messages: predictedMessages }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
