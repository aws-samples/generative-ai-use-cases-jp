## ローカル環境構築手順

開発者用にローカル環境を構築する手順を説明します。なお、ローカル環境を構築する場合も、[AWS へのデプロイ](/README.md#デプロイ)は完了している必要があります。

### Unix 系コマンドが使えるユーザー (Cloud9, Linux, MacOS 等)

以下のコマンドを実行することで、必要な環境変数を CloudFormation の Output から動的に取得し、サーバーを起動します。
なお、内部で `aws` コマンドと `jq` コマンドを利用しているので、未インストールの場合はインストールしてから実行してください。

```bash
npm run web:devw
```

> [!TIP]
> AWSへの認証には[デフォルトのプロファイル](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-configure-files.html#cli-configure-files-using-profiles)が利用されます。  
> 別のプロファイルやアクセスキーを認証に使いたい場合はあらかじめ環境変数をセットしておくか、[setup-env.sh](/setup-env.sh)に追加しておくことができます。
> ```bash
> export AWS_PROFILE=''
> export AWS_DEFAULT_REGION=''
> ```

### その他のユーザー (Windows 等)

デプロイ完了時に表示される Outputs から API の Endpoint (Output key = APIApiEndpoint...)、Cognito User Pool ID (Output key = AuthUserPoolId...)、Cognito User Pool Client ID (Output Key = AuthUserPoolClientId...) 、Cognito Identity Pool ID (Output Key = AuthIdPoolId...)、レスポンスストリーミングの Lambda 関数の ARN (Output Key = APIPredictStreamFunctionArn...) を取得します。
デプロイ時の出力が消えている場合、[CloudFormation](https://console.aws.amazon.com/cloudformation/home) の GenerativeAiUseCasesStack をクリックして Outputs タブから確認できます。

それらの値を環境変数に設定する必要がありますが、環境変数の設定は以下のいずれかの方法で行うことができます。

#### シェル変数を export する方法

以下のコマンドでシェル変数に値を設定し `export` とすることで、環境変数として利用できます。Windows 利用者でかつ PowerShell を利用している方は、コマンドが異なりますので[こちら](https://learn.microsoft.com/ja-jp/powershell/module/microsoft.powershell.core/about/about_environment_variables)を参照の上、設定を行なってください。

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
export VITE_APP_USE_CASE_BUILDER_ENABLED=<UseCase Builder Flag>
export VITE_APP_OPTIMIZE_PROMPT_FUNCTION_ARN=<Function ARN>
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
export VITE_APP_USE_CASE_BUILDER_ENABLED=true
export VITE_APP_OPTIMIZE_PROMPT_FUNCTION_ARN=arn:aws:lambda:ap-northeast-1:000000000000:function:FunctionName
```

#### `.env` ファイルを利用する方法

フロントエンドは Vite を利用してビルドを行っていますが、Vite は `.env` ファイルを利用して環境変数を設定できます（[参考](https://ja.vitejs.dev/guide/env-and-mode#env-files)）。`/packages/web/.env` ファイルを作成し、上記の「シェル変数を export する方法」と同様の項目を設定してください。なお、`export` の記載は不要なので、ご注意ください。

```bash
VITE_APP_API_ENDPOINT=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/api/
VITE_APP_REGION=ap-northeast-1
### 以降省略 ###
```

#### ローカルサーバの起動

環境変数の設定ができたら、以下のコマンドを実行します。

```bash
npm run web:dev
```

正常に実行されれば http://localhost:5173 で起動しますので、ブラウザからアクセスしてみてください。

## Pull Request を出す場合

バグ修正や機能改善などの Pull Request は歓迎しております。コミットする前に、lint ツールを実行してください。

```bash
npm run lint
```
