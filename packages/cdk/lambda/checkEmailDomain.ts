import { PreSignUpTriggerEvent, Context, Callback } from 'aws-lambda';

const ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR =
  process.env.ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR;
const ALLOWED_SIGN_UP_EMAIL_DOMAINS: string[] = JSON.parse(
  ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR!
);

const ALLOWED_SIGN_UP_EMAILS_STR = process.env.ALLOWED_SIGN_UP_EMAILS_STR;
const ALLOWED_SIGN_UP_EMAILS: string[] = JSON.parse(
  ALLOWED_SIGN_UP_EMAILS_STR || '[]'
);

// Determine if the email is allowed
const checkEmail = (email: string): boolean => {
  // If the number of @ in the email address is not one, always reject it
  if (email.split('@').length !== 2) {
    return false;
  }

  // If both allowed emails and domains are empty, allow all
  if (
    ALLOWED_SIGN_UP_EMAILS.length === 0 &&
    ALLOWED_SIGN_UP_EMAIL_DOMAINS.length === 0
  ) {
    return true;
  }

  // Check if the email is in the allowed emails list
  if (ALLOWED_SIGN_UP_EMAILS.includes(email)) {
    return true;
  }

  // Check if the domain part of the email address matches any of the allowed domains
  const domain = email.split('@')[1];
  return ALLOWED_SIGN_UP_EMAIL_DOMAINS.includes(domain);
};

/**
 * Cognito Pre Sign-up Lambda Trigger.
 *
 * @param event - The event from Cognito.
 * @param context - The Lambda execution context.
 * @param callback - The callback function to return data or error.
 */
exports.handler = async (
  event: PreSignUpTriggerEvent,
  context: Context,
  callback: Callback
) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const isAllowed = checkEmail(event.request.userAttributes.email);
    if (isAllowed) {
      // If successful, return the event object as is
      callback(null, event);
    } else {
      // If failed, return an error message
      callback(new Error('Invalid email domain or email address'));
    }
  } catch (error) {
    console.log('Error ocurred:', error);
    // Check if the error is an instance of Error and return an appropriate error message
    if (error instanceof Error) {
      callback(error);
    } else {
      // If the error is not an instance of Error, return a general error message
      callback(new Error('An unknown error occurred.'));
    }
  }
};
