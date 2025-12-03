import {
  CustomEmailSenderTriggerEvent,
  Context,
  CustomEmailSenderTriggerHandler,
} from 'aws-lambda';
import {
  KmsKeyringNode,
  buildClient,
  CommitmentPolicy,
} from '@aws-crypto/client-node';

const SERVICE_NAME = process.env.SERVICE_NAME || 'GenU';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || '';
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

// Configure AWS Encryption SDK
const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);
const keyring = new KmsKeyringNode({
  generatorKeyId: process.env.KEY_ID,
  keyIds: [process.env.KEY_ARN || ''],
});

// Color theme (matching frontend)
const COLORS = {
  primary: '#232F3E', // aws-squid-ink
  accent: '#2074d5', // aws-sky
  orange: '#ff9900', // aws-smile
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  lightGray: '#e0e0e0',
};

// Common HTML email layout
const createEmailHtml = (
  title: string,
  bodyContent: string,
  footerNote?: string
): string => {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; background-color: ${COLORS.background};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: ${COLORS.white}; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${COLORS.primary}; padding: 24px 32px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: ${COLORS.white}; font-size: 24px; font-weight: bold;">${SERVICE_NAME}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${COLORS.background}; padding: 20px 32px; border-radius: 0 0 8px 8px; border-top: 1px solid ${COLORS.lightGray};">
              ${footerNote ? `<p style="margin: 0; font-size: 12px; color: #666;">${footerNote}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// Verification code block component
const createCodeBlock = (code: string): string => {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; background-color: ${COLORS.background}; border: 2px solid ${COLORS.accent}; border-radius: 8px; padding: 16px 32px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: ${COLORS.primary};">${code}</span>
      </div>
    </div>
  `;
};

// User credentials block component (for admin invitation)
const createCredentialsBlock = (
  username: string,
  tempPassword: string
): string => {
  return `
    <div style="background-color: ${COLORS.background}; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 8px 0;">
            <span style="font-size: 14px; color: #666;">ユーザー名（メールアドレス）</span><br>
            <span style="font-size: 16px; font-weight: bold; color: ${COLORS.primary};">${username}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-top: 1px solid ${COLORS.lightGray};">
            <span style="font-size: 14px; color: #666;">仮パスワード</span><br>
            <span style="font-size: 16px; font-weight: bold; color: ${COLORS.primary}; font-family: monospace;">${tempPassword}</span>
          </td>
        </tr>
      </table>
    </div>
  `;
};

// Sign up confirmation email
const createSignUpEmail = (
  code: string
): { subject: string; htmlContent: string } => {
  const bodyContent = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.primary}; font-size: 20px;">メールアドレスの確認</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.text}; font-size: 15px; line-height: 1.6;">
      ${SERVICE_NAME}へのご登録ありがとうございます。<br>
      アカウントを有効にするため、以下の確認コードを入力してください。
    </p>
    ${createCodeBlock(code)}
    <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.5;">
      このコードは24時間有効です。<br>
      心当たりがない場合は、このメールを無視してください。
    </p>
  `;

  return {
    subject: `【${SERVICE_NAME}】メールアドレスの確認`,
    htmlContent: createEmailHtml('メールアドレスの確認', bodyContent),
  };
};

// Password reset email
const createForgotPasswordEmail = (
  code: string
): { subject: string; htmlContent: string } => {
  const bodyContent = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.primary}; font-size: 20px;">パスワードリセット</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.text}; font-size: 15px; line-height: 1.6;">
      パスワードリセットのリクエストを受け付けました。<br>
      以下の確認コードを入力して、新しいパスワードを設定してください。
    </p>
    ${createCodeBlock(code)}
    <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.5;">
      このコードは1時間有効です。<br>
      このリクエストに心当たりがない場合は、このメールを無視してください。アカウントのパスワードは変更されません。
    </p>
  `;

  return {
    subject: `【${SERVICE_NAME}】パスワードリセット`,
    htmlContent: createEmailHtml('パスワードリセット', bodyContent),
  };
};

// Admin create user email
const createAdminCreateUserEmail = (
  username: string,
  tempPassword: string
): { subject: string; htmlContent: string } => {
  const bodyContent = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.primary}; font-size: 20px;">アカウント招待</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.text}; font-size: 15px; line-height: 1.6;">
      ${SERVICE_NAME}へ招待されました。<br>
      以下の情報を使用してログインしてください。
    </p>
    ${createCredentialsBlock(username, tempPassword)}
    <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.5;">
      初回ログイン時にパスワードの変更が求められます。<br>
      セキュリティのため、仮パスワードは安全に管理し、ログイン後すぐに変更してください。
    </p>
  `;

  const footerNote =
    'このメールは管理者によって送信されました。心当たりがない場合は、システム管理者にお問い合わせください。';

  return {
    subject: `【${SERVICE_NAME}】アカウント招待`,
    htmlContent: createEmailHtml('アカウント招待', bodyContent, footerNote),
  };
};

// Decrypt code using AWS Encryption SDK
const decryptCode = async (encryptedCode: string): Promise<string> => {
  const { plaintext } = await decrypt(
    keyring,
    Buffer.from(encryptedCode, 'base64')
  );
  return Buffer.from(plaintext).toString('utf-8');
};

// Send email via SendGrid API
const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: SENDGRID_FROM_EMAIL },
    subject: subject,
    content: [{ type: 'text/html', value: htmlContent }],
  };

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `SendGrid API error: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  console.log(`Email sent successfully to ${to}`);
};

export const handler: CustomEmailSenderTriggerHandler = async (
  event: CustomEmailSenderTriggerEvent,
  _context: Context
) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const { triggerSource, request, userName } = event;

  // Decrypt the code using AWS Encryption SDK
  const encryptedCode = request.code;
  if (!encryptedCode) {
    console.log('No code provided, skipping email send');
    return event;
  }

  const decryptedCode = await decryptCode(encryptedCode);

  let emailContent: { subject: string; htmlContent: string } | null = null;
  // Type guard: userAttributes is a StringMap (Record<string, string>) for most trigger sources
  const userAttributes = request.userAttributes as
    | Record<string, string>
    | undefined;
  const recipientEmail = userAttributes?.email || userName;

  switch (triggerSource) {
    case 'CustomEmailSender_SignUp':
    case 'CustomEmailSender_ResendCode':
      emailContent = createSignUpEmail(decryptedCode);
      break;

    case 'CustomEmailSender_ForgotPassword':
      emailContent = createForgotPasswordEmail(decryptedCode);
      break;

    case 'CustomEmailSender_AdminCreateUser':
      emailContent = createAdminCreateUserEmail(recipientEmail, decryptedCode);
      break;

    default:
      console.log(`Unhandled trigger source: ${triggerSource}`);
      return event;
  }

  if (emailContent && recipientEmail) {
    await sendEmail(
      recipientEmail,
      emailContent.subject,
      emailContent.htmlContent
    );
  }

  return event;
};
