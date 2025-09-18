import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  MessageActionType,
  DeliveryMediumType,
  AttributeType
} from '@aws-sdk/client-cognito-identity-provider';
import { verifyAdminAccess, isAdminContext, CORS_HEADERS } from './utils/adminAuth';

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION! });
const USER_POOL_ID = process.env.USER_POOL_ID!;

export interface InviteUserRequest {
  emails: string[];
  sendEmail?: boolean;
}

export interface InviteResult {
  email: string;
  success: boolean;
  username?: string;
  temporaryPassword?: string;
  error?: string;
  message?: string;
}

// Generate a secure temporary password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';

  // Ensure password meets requirements: uppercase, lowercase, number, symbol, 8+ chars
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 26)); // uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26)); // lowercase
  password += '0123456789'.charAt(Math.floor(Math.random() * 10)); // number
  password += '!@#$%^&*'.charAt(Math.floor(Math.random() * 8)); // symbol

  // Fill remaining characters
  for (let i = 4; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(event);
    if (!isAdminContext(adminResult)) {
      return adminResult;
    }

    const { tenantId } = adminResult;

    // Parse request body
    let requestBody: InviteUserRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid JSON in request body' }),
      };
    }

    const { emails, sendEmail = false } = requestBody;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'emails array is required and must not be empty' }),
      };
    }

    if (emails.length > 100) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Maximum 100 users can be invited at once' }),
      };
    }

    // Validate all emails
    const invalidEmails = emails.filter(email => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Invalid email addresses found',
          invalidEmails
        }),
      };
    }

    // Check for duplicate emails
    const uniqueEmails = Array.from(new Set(emails));
    if (uniqueEmails.length !== emails.length) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Duplicate emails found in request' }),
      };
    }

    // Invite users
    const results: InviteResult[] = [];

    for (const email of uniqueEmails) {
      try {
        // First, check if user already exists
        let userExists = false;
        let userStatus = '';
        
        try {
          const getUserCommand = new AdminGetUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: email,
          });
          
          const existingUser = await cognitoClient.send(getUserCommand);
          userExists = true;
          userStatus = existingUser.UserStatus || '';
          
          console.log(`User ${email} already exists with status: ${userStatus}`);
          
        } catch (getUserError: any) {
          if (getUserError.name !== 'UserNotFoundException') {
            throw getUserError; // Re-throw if it's not a "user not found" error
          }
          // User doesn't exist, proceed with creation
        }

        if (userExists) {
          // User already exists - mark as failed
          results.push({
            email,
            success: false,
            error: 'User already exists',
          });
          
          console.log(`User ${email} already exists with status: ${userStatus}`);
        } else {
          // Create new user
          const temporaryPassword = generateTemporaryPassword();

          // Ensure invited users have the same tenant ID as the admin who is inviting them
          const userAttributes: AttributeType[] = [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'custom:tenant_id', Value: tenantId }, // Same tenant as the admin
            { Name: 'custom:tenantAdmin', Value: 'false' }, // New users are not admins by default
          ];

          const command = new AdminCreateUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: email,
            UserAttributes: userAttributes,
            TemporaryPassword: temporaryPassword,
            MessageAction: sendEmail ? undefined : MessageActionType.SUPPRESS,
            DesiredDeliveryMediums: sendEmail ? [DeliveryMediumType.EMAIL] : undefined,
          });

          const response = await cognitoClient.send(command);

          results.push({
            email,
            success: true,
            username: response.User?.Username,
            temporaryPassword: sendEmail ? undefined : temporaryPassword, // Only return password if not sending email
            message: 'New user created successfully',
          });

          console.log(`Successfully created new user: ${email}`);
        }

      } catch (error: any) {
        console.error(`Failed to process user ${email}:`, error);

        let errorMessage = 'Unknown error';
        if (error.name === 'InvalidParameterException') {
          errorMessage = 'Invalid parameters';
        } else if (error.name === 'InvalidPasswordException') {
          errorMessage = 'Invalid password format';
        } else if (error.name === 'UnsupportedUserStateException') {
          errorMessage = 'Cannot resend invitation - user is not in correct status';
        } else if (error.name === 'UserNotFoundException') {
          errorMessage = 'User not found for resend operation';
        }

        results.push({
          email,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Invitation results: ${successCount} successful, ${failCount} failed`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        results,
        summary: {
          totalRequested: uniqueEmails.length,
          successful: successCount,
          failed: failCount,
        },
      }),
    };

  } catch (error) {
    console.error('Error inviting users:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Failed to invite users',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
