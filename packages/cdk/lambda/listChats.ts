import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listChats } from './repository';
import { getUsername } from './utils/tenantUtils';
import {
  internalServerError500Response,
  ok200Response,
} from './utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const exclusiveStartKey = event?.queryStringParameters?.exclusiveStartKey;
    const res = await listChats(userId, event, exclusiveStartKey);

    return ok200Response(res);
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
