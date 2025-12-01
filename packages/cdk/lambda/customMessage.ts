import { CustomMessageTriggerEvent, Context, Callback } from 'aws-lambda';

// カラーテーマ（フロントエンドに合わせる）
const COLORS = {
  primary: '#232F3E', // aws-squid-ink
  accent: '#2074d5', // aws-sky
  orange: '#ff9900', // aws-smile
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  lightGray: '#e0e0e0',
};

const SERVICE_NAME = 'GaiXer';

// HTMLメールの共通レイアウト
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
          <!-- ヘッダー -->
          <tr>
            <td style="background-color: ${COLORS.primary}; padding: 24px 32px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: ${COLORS.white}; font-size: 24px; font-weight: bold;">${SERVICE_NAME}</h1>
            </td>
          </tr>
          <!-- 本文 -->
          <tr>
            <td style="padding: 32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- フッター -->
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

// 認証コード表示用コンポーネント
const createCodeBlock = (code: string): string => {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; background-color: ${COLORS.background}; border: 2px solid ${COLORS.accent}; border-radius: 8px; padding: 16px 32px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: ${COLORS.primary};">${code}</span>
      </div>
    </div>
  `;
};

// ユーザー情報表示用コンポーネント（管理者招待用）
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

// ユーザー登録確認メール
const createSignUpEmail = (code: string): { subject: string; message: string } => {
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
    message: createEmailHtml('メールアドレスの確認', bodyContent),
  };
};

// パスワードリセットメール
const createForgotPasswordEmail = (code: string): { subject: string; message: string } => {
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
    message: createEmailHtml('パスワードリセット', bodyContent),
  };
};

// 管理者招待メール
const createAdminCreateUserEmail = (
  username: string,
  tempPassword: string
): { subject: string; message: string } => {
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
    message: createEmailHtml('アカウント招待', bodyContent, footerNote),
  };
};

exports.handler = async (
  event: CustomMessageTriggerEvent,
  _context: Context,
  callback: Callback
) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const { triggerSource, request } = event;
    const code = request.codeParameter || '';
    const username = request.usernameParameter || event.userName || '';
    const tempPassword = request.codeParameter || '';

    let emailContent: { subject: string; message: string } | null = null;

    switch (triggerSource) {
      case 'CustomMessage_SignUp':
      case 'CustomMessage_ResendCode':
        emailContent = createSignUpEmail(code);
        break;

      case 'CustomMessage_ForgotPassword':
        emailContent = createForgotPasswordEmail(code);
        break;

      case 'CustomMessage_AdminCreateUser':
        emailContent = createAdminCreateUserEmail(username, tempPassword);
        break;

      default:
        // その他のトリガーはデフォルトメッセージを使用
        console.log(`Unhandled trigger source: ${triggerSource}`);
        callback(null, event);
        return;
    }

    if (emailContent) {
      event.response.emailSubject = emailContent.subject;
      event.response.emailMessage = emailContent.message;
    }

    callback(null, event);
  } catch (error) {
    console.error('Error occurred:', error);
    // エラー時はデフォルトメッセージを使用
    callback(null, event);
  }
};
