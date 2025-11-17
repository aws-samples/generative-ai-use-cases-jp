import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateUseCaseRequest } from 'generative-ai-use-cases';
import { createUseCase } from './useCaseBuilderRepository';
import { getUsername } from '../utils/tenantUtils';
import {
  internalServerError500Response,
  ok200Response,
} from '../utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: CreateUseCaseRequest = JSON.parse(event.body!);
    const userId = getUsername(event);
    const useCase = await createUseCase(userId, req, event);

    return ok200Response(useCase);
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
