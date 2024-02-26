## ローカル環境構築手順

開発者用にローカル環境を構築する手順を説明します。なお、ローカル環境を構築する場合も、[AWS へのデプロイ](/README.md#デプロイ)は完了している必要があります。

### Unix 系コマンドが使えるユーザー (Linux, MacOS 等)

以下のコマンドを実行することで、必要な環境変数を CloudFormation の Output から動的に取得し、サーバーを起動します。
なお、内部で `aws` コマンドと `jq` コマンドを利用しているので、未インストールの場合はインストールしてから実行してください。

```bash
npm run web:devw
```

### その他のユーザー (Windows 等)

デプロイ完了時に表示される Outputs から API の Endpoint (Output key = APIApiEndpoint...)、Cognito User Pool ID (Output key = AuthUserPoolId...)、Cognito User Pool Client ID (Output Key = AuthUserPoolClientId...) 、Cognito Identity Pool ID (Output Key = AuthIdPoolId...)、レスポンスストリーミングの Lambda 関数の ARN (Output Key = APIPredictStreamFunctionArn...) を取得します。
デプロイ時の出力が消えている場合、[CloudFormation](https://console.aws.amazon.com/cloudformation/home) の GenerativeAiUseCasesStack をクリックして Outputs タブから確認できます。
それらの値を以下のように環境変数に設定してください。

```bash
export VITE_APP_API_ENDPOINT=<API Endpoint>
export VITE_APP_REGION=<デプロイしたリージョン>
export VITE_APP_USER_POOL_ID=<Cognito User Pool ID>
export VITE_APP_USER_POOL_CLIENT_ID=<Cognito User Pool Client ID>
export VITE_APP_IDENTITY_POOL_ID=<Cognito Identity Pool ID>
export VITE_APP_PREDICT_STREAM_FUNCTION_ARN=<Function ARN>
export VITE_APP_RAG_ENABLED=<RAG Flag>
export VITE_APP_AGENT_ENABLED=<Bedrock Agent Flag>
export VITE_APP_SELF_SIGN_UP_ENABLED=<Self Signup Flag>
export VITE_APP_MODEL_REGION=<Bedrock/SageMakerモデルのリージョン>
export VITE_APP_MODEL_IDS=<Bedrock モデルの JSON Array>
export VITE_APP_IMAGE_MODEL_IDS=<Bedrock 画像生成モデルの JSON Array>
export VITE_APP_ENDPOINT_NAMES=<SageMaker モデルの JSON Array>
export VITE_APP_SAMLAUTH_ENABLED=<SAML 認証 Flag>
export VITE_APP_SAML_COGNITO_DOMAIN_NAME=<SAML Cognito Domain>
export VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PROVIDER_NAME=<SAML Cognito Provider Name>
export VITE_APP_AGENT_NAMES=<Bedrock Agent Names の JSON Array>
export VITE_APP_RECOGNIZE_FILE_ENABLED=<ファイルアップロード Flag>
```

具体例は以下です。

```bash
export VITE_APP_API_ENDPOINT=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/api/
export VITE_APP_REGION=ap-northeast-1
export VITE_APP_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
export VITE_APP_USER_POOL_CLIENT_ID=abcdefghijklmnopqrstuvwxyz
export VITE_APP_IDENTITY_POOL_ID=ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxxxxxxx
export VITE_APP_PREDICT_STREAM_FUNCTION_ARN=arn:aws:lambda:ap-northeast-1:000000000000:function:FunctionName
export VITE_APP_RAG_ENABLED=true
export VITE_APP_AGENT_ENABLED=true
export VITE_APP_SELF_SIGN_UP_ENABLED=true
export VITE_APP_MODEL_REGION=us-west-2
export VITE_APP_MODEL_IDS=["anthropic.claude-instant-v1","anthropic.claude-v2"]
export VITE_APP_IMAGE_MODEL_IDS=["stability.stable-diffusion-xl-v1","amazon.titan-image-generator-v1"]
export VITE_APP_ENDPOINT_NAMES=[]
export VITE_APP_SAMLAUTH_ENABLED=true
export VITE_APP_SAML_COGNITO_DOMAIN_NAME=your-preferred-name.auth.ap-northeast-1.amazoncognito.com
export VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PROVIDER_NAME=EntraID
export VITE_APP_AGENT_NAMES=["SearchEngine"]
export VITE_APP_RECOGNIZE_FILE_ENABLED=true
```

続いて以下のコマンドを実行します。

```bash
npm run web:dev
```

正常に実行されれば http://localhost:5173 で起動しますので、ブラウザからアクセスしてみてください。

## Pull Request を出す場合

バグ修正や機能改善などの Pull Request は歓迎しております。コミットする前に、lint ツールを実行してください。

```bash
npm run lint
```
