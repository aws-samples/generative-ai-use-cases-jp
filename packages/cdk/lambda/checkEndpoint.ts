import { APIGatewayProxyResult } from 'aws-lambda';
import { SageMaker } from '@aws-sdk/client-sagemaker';

const sagemaker = new SageMaker();
const endpointName = process.env.ENDPOINT_NAME;

exports.handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    // Get the status of the SageMaker endpoint
    const describeEndpointResponse = await sagemaker.describeEndpoint({
      EndpointName: endpointName || '',
    });

    const endpointStatus = describeEndpointResponse.EndpointStatus;

    return createResponse(200, {
      EndpointStatus: endpointStatus,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${error}`);
    }
    return createResponse(200, {
      EndpointStatus: 'OutOfService',
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
