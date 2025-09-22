import { PreSignUpTriggerEvent, Context, Callback } from 'aws-lambda';
import { SelfSignUpTenantMapEntry } from 'generative-ai-use-cases';

const TENANT_MAP_STR = process.env.SELF_SIGNUP_TENANT_MAP || '[]';
const TENANT_MAP: SelfSignUpTenantMapEntry[] = JSON.parse(TENANT_MAP_STR);

const isAllowed = (email: string): boolean => {
  if (email.split('@').length !== 2) {
    return false;
  }
  const lowerEmail = email.toLowerCase();
  const domain = lowerEmail.split('@')[1];
  for (const entry of TENANT_MAP) {
    if (entry.emails && entry.emails.includes(lowerEmail)) {
      return true;
    }
    if (entry.domains && entry.domains.includes(domain)) {
      return true;
    }
  }
  return false;
};

exports.handler = async (
  event: PreSignUpTriggerEvent,
  _context: Context,
  callback: Callback
) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Allow admin-created users to bypass domain validation
    if (event.triggerSource === 'PreSignUp_AdminCreateUser') {
      console.log('Admin-created user detected, bypassing domain validation');
      callback(null, event);
      return;
    }

    // For self-signup and external provider users, perform domain validation
    const email = event.request.userAttributes.email;
    if (isAllowed(email) || TENANT_MAP.length === 0) {
      callback(null, event);
    } else {
      callback(new Error('Unknown tenant'));
    }
  } catch (error) {
    console.log('Error occurred:', error);
    if (error instanceof Error) {
      callback(error);
    } else {
      callback(new Error('An unknown error occurred.'));
    }
  }
};
