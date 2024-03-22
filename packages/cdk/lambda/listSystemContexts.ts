import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listSystemContexts } from './repository';
import { SystemContextList, SystemContextListItem } from '../../web/src/prompts';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const systemContextItems = await listSystemContexts(userId);
    const systemContextList: SystemContextList = [{
      title: "システムコンテキスト",
      items: systemContextItems as SystemContextListItem[],
    }]
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(
        systemContextList,
      ),
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
