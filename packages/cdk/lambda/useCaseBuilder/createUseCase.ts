import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateUseCaseRequest } from 'generative-ai-use-cases-jp';
import { createUseCase } from './useCaseBuilderRepository';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: CreateUseCaseRequest = JSON.parse(event.body!);
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const useCaseIdRes = await createUseCase({
      userId,
      title: req.title,
      promptTemplate: req.promptTemplate,
      description: req.description,
      inputExamples: req.inputExamples,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(useCaseIdRes),
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
