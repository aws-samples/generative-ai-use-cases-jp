import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { deleteUseCase } from './useCaseBuilderRepository';
import { getUsername } from '../utils/tenantUtils';
import {
  internalServerError500Response,
  noContent204Response,
} from '../utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const useCaseId = event.pathParameters!.useCaseId!;

    await deleteUseCase(userId, useCaseId, event);

    return noContent204Response();
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
