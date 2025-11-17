import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateSystemContextTitleRequest } from 'generative-ai-use-cases';
import { updateSystemContextTitle } from './repository';
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
    const systemContextId = event.pathParameters!.systemContextId!;
    const req: UpdateSystemContextTitleRequest = JSON.parse(event.body!);
    const systemContext = await updateSystemContextTitle(
      userId,
      systemContextId,
      req.title,
      event
    );

    return ok200Response({ systemContext });
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
