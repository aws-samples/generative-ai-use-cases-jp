import { PostConfirmationTriggerEvent } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { SelfSignUpTenantMapEntry } from 'generative-ai-use-cases';

const TENANT_MAP_STR = process.env.SELF_SIGNUP_TENANT_MAP || '[]';
const TENANT_MAP: SelfSignUpTenantMapEntry[] = JSON.parse(TENANT_MAP_STR);

const cognito = new CognitoIdentityProviderClient({});

const findTenantId = (email: string): string | null => {
  if (email.split('@').length !== 2) {
    return null;
  }
  const lowerEmail = email.toLowerCase();
  const domain = lowerEmail.split('@')[1];
  for (const entry of TENANT_MAP) {
    if (entry.emails && entry.emails.includes(lowerEmail)) {
      return entry.tenantId;
    }
    if (entry.domains && entry.domains.includes(domain)) {
      return entry.tenantId;
    }
  }
  return null;
};

exports.handler = async (event: PostConfirmationTriggerEvent) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));
    // Skip subsequent processing for password reset
    if (event.triggerSource === 'PostConfirmation_ConfirmForgotPassword') {
      console.log(
        'postConfirmHandler - Skipping processing for ConfirmForgotPassword (password reset)'
      );
      return event;
    }

    const email = event.request.userAttributes.email;
    const tenantId = findTenantId(email);
    if (!tenantId) {
      if (TENANT_MAP.length === 0) {
        return event;
      }
      throw new Error('Unknown tenant');
    }

    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        UserAttributes: [{ Name: 'custom:tenant_id', Value: tenantId }],
      })
    );
    return event;
  } catch (error) {
    console.log('Error occurred:', error);
    throw error;
  }
};
