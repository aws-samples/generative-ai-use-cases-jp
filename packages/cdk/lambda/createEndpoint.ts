import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SageMaker } from '@aws-sdk/client-sagemaker';

const sagemaker = new SageMaker();
const endpointConfigName = process.env.ENDPOINT_CONFIG_NAME;
const endpointName = process.env.ENDPOINT_NAME;

exports.handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestType = event.httpMethod;

    if (requestType === 'POST') {
      // Create the SageMaker endpoint
      const createEndpointResponse = await sagemaker.createEndpoint({
        EndpointName: endpointName,
        EndpointConfigName: endpointConfigName,
      });

      console.log(
        `SageMaker endpoint created: ${createEndpointResponse.EndpointArn}`
      );
      return createResponse(200, {
        Message: 'SageMaker endpoint created',
        EndpointArn: createEndpointResponse.EndpointArn,
      });
    } else if (requestType === 'DELETE') {
      // Delete the SageMaker endpoint
      await sagemaker.deleteEndpoint({ EndpointName: endpointName });
      console.log(`SageMaker endpoint deleted: ${endpointName}`);
      return createResponse(200, {
        Message: 'SageMaker endpoint deleted',
      });
    } else {
      return createResponse(400, {
        Message: 'Unsupported Method',
      });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${error}`);
    }
    return createResponse(500, {
      Message: 'Internal Server Error',
    });
  }
};

function createResponse(
  statusCode: number,
  body: object
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
