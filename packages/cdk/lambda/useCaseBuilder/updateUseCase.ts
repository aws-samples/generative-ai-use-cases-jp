import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateUseCaseRequest } from 'generative-ai-use-cases';
import { updateUseCase } from './useCaseBuilderRepository';
import { getUsername } from '../utils/tenantUtils';
import {
  internalServerError500Response,
  ok200Response,
} from '../utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const useCaseId = event.pathParameters!.useCaseId!;
    const req: UpdateUseCaseRequest = JSON.parse(event.body!);

    await updateUseCase(userId, useCaseId, req, event);

    return ok200Response();
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
