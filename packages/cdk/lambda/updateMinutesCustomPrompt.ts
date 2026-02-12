import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateMinutesCustomPromptRequest } from 'generative-ai-use-cases';
import { updateMinutesCustomPrompt } from './repository';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const minutesCustomPromptId = event.pathParameters!.minutesCustomPromptId!;
    const req: UpdateMinutesCustomPromptRequest = JSON.parse(event.body!);
    const prompt = await updateMinutesCustomPrompt(
      userId,
      minutesCustomPromptId,
      req.title,
      req.body
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ minutesCustomPrompt: prompt }),
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
