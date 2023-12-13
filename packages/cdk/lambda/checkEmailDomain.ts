import { PreSignUpTriggerEvent, Context, Callback } from 'aws-lambda';

const ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR =
  process.env.ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR;
const ALLOWED_SIGN_UP_EMAIL_DOMAINS: string[] = JSON.parse(
  ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR!
);

// メールアドレスのドメインを許可するかどうかを判定する
const checkEmailDomain = (email: string): boolean => {
  // メールアドレスの中の @ の数が1つでない場合は、常に許可しない
  if (email.split('@').length !== 2) {
    return false;
  }

  // メールアドレスのドメイン部分が、許可ドメインの"いずれか"と一致すれば許可する
  // それ以外の場合は、許可しない
  // (ALLOWED_SIGN_UP_EMAIL_DOMAINSが空の場合は、常に許可しない)
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

    const isAllowed = checkEmailDomain(event.request.userAttributes.email);
    if (isAllowed) {
      // 成功した場合、イベントオブジェクトをそのまま返す
      callback(null, event);
    } else {
      // 失敗した場合、エラーメッセージを返す
      callback(new Error('Invalid email domain'));
    }
  } catch (error) {
    console.log('Error ocurred:', error);
    // エラーがError型であるか確認し、適切なエラーメッセージを返す
    if (error instanceof Error) {
      callback(error);
    } else {
      // エラーがError型ではない場合、一般的なエラーメッセージを返す
      callback(new Error('An unknown error occurred.'));
    }
  }
};
