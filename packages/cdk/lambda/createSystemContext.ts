import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSystemContext } from './repository';
import { SystemContext } from 'generative-ai-use-cases';
import { getUsername } from './utils/tenantUtils';
import {
  internalServerError500Response,
  ok200Response,
} from './utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: SystemContext = JSON.parse(event.body!);
    const userId = getUsername(event);
    const messages = await createSystemContext(
      userId,
      req.systemContextTitle,
      req.systemContext,
      event
    );

    return ok200Response({
      messages,
    });
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
