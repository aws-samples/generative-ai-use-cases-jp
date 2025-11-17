import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { deleteVideoJob } from './repositoryVideoJob';
import { getUsername } from './utils/tenantUtils';
import {
  internalServerError500Response,
  noContent204Response,
} from './utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const createdDate: string = event.pathParameters!.createdDate!;

    await deleteVideoJob(userId, createdDate);

    return noContent204Response();
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
