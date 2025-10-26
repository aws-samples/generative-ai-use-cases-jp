import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AttributeType,
} from '@aws-sdk/client-cognito-identity-provider';

// Initialize Cognito client with VPC endpoint support for closed networks
const cognitoClient = new CognitoIdentityProviderClient({
  endpoint: process.env.COGNITO_IDP_ENDPOINT,
});

/**
 * Extract user ID from API Gateway event
 */
export function getUserIdFromEvent(event: APIGatewayProxyEvent): string {
  const userId = event.requestContext.authorizer!.claims['cognito:username'];
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
}

/**
 * Get user email from Cognito
 */
export async function getUserEmail(
  userId: string
): Promise<string | undefined> {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: process.env.USER_POOL_ID!,
      Username: userId,
    });

    const response = await cognitoClient.send(command);
    const emailAttribute = response.UserAttributes?.find(
      (attr: AttributeType) => attr.Name === 'email'
    );

    return emailAttribute?.Value;
  } catch (error) {
    console.error('Error getting user email:', error);
    return undefined;
  }
}
