## Local Environment Setup

This section explains the steps to set up a local development environment. Note that you need to complete the [deployment to AWS](/README.md#deployment) before setting up the local environment.

### For Unix-based Command Users (Cloud9, Linux, MacOS, etc.)

Run the following command to dynamically retrieve the necessary environment variables from the CloudFormation Outputs and start the server.
Note that this command internally uses the `aws` and `jq` commands, so install them if they are not already installed.

```bash
npm run web:devw
```

> [!TIP]
> The [default profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html#cli-configure-files-using-profiles) is used for AWS authentication.
> If you want to use a different profile or access key for authentication, you can set the environment variables in advance or add them to [setup-env.sh](/setup-env.sh).
> ```bash
> export AWS_PROFILE=''
> export AWS_DEFAULT_REGION=''
> ```

### For Other Users (Windows, etc.)

After deployment, retrieve the API Endpoint (Output key = APIApiEndpoint...), Cognito User Pool ID (Output key = AuthUserPoolId...), Cognito User Pool Client ID (Output Key = AuthUserPoolClientId...), Cognito Identity Pool ID (Output Key = AuthIdPoolId...), and the ARN of the Lambda function for response streaming (Output Key = APIPredictStreamFunctionArn...) from the Outputs.
If the deployment output is no longer available, you can find it in the Outputs tab of the GenerativeAiUseCasesStack in [CloudFormation](https://console.aws.amazon.com/cloudformation/home).

You need to set these values as environment variables, which can be done using one of the following methods.

#### Setting Shell Variables with export

You can set the values as shell variables and use `export` to make them available as environment variables. For Windows users using PowerShell, the command may be different, so please refer to [this guide](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_environment_variables) and set the variables accordingly.

```bash
export VITE_APP_API_ENDPOINT=<API Endpoint>
export VITE_APP_REGION=<Deployed Region>
export VITE_APP_USER_POOL_ID=<Cognito User Pool ID>
export VITE_APP_USER_POOL_CLIENT_ID=<Cognito User Pool Client ID>
export VITE_APP_IDENTITY_POOL_ID=<Cognito Identity Pool ID>
export VITE_APP_PREDICT_STREAM_FUNCTION_ARN=<Function ARN>
export VITE_APP_RAG_ENABLED=<RAG Flag>
export VITE_APP_AGENT_ENABLED=<Bedrock Agent Flag>
export VITE_APP_SELF_SIGN_UP_ENABLED=<Self Signup Flag>
export VITE_APP_MODEL_REGION=<Bedrock/SageMaker Model Region>
export VITE_APP_MODEL_IDS=<Bedrock Model JSON Array>
export VITE_APP_MULTI_MODAL_MODEL_IDS=<Bedrock Model JSON Array>
export VITE_APP_IMAGE_MODEL_IDS=<Bedrock Image Generation Model JSON Array>
export VITE_APP_ENDPOINT_NAMES=<SageMaker Model JSON Array>
export VITE_APP_SAMLAUTH_ENABLED=<SAML Authentication Flag>
export VITE_APP_SAML_COGNITO_DOMAIN_NAME=<SAML Cognito Domain>
export VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PROVIDER_NAME=<SAML Cognito Provider Name>
export VITE_APP_AGENT_NAMES=<Bedrock Agent Names JSON Array>
```

Here's a concrete example:

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
export VITE_APP_MULTI_MODAL_MODEL_IDS=["anthropic.claude-3-sonnet-20240229-v1:0"]
export VITE_APP_IMAGE_MODEL_IDS=["stability.stable-diffusion-xl-v1","amazon.titan-image-generator-v1"]
export VITE_APP_ENDPOINT_NAMES=[]
export VITE_APP_SAMLAUTH_ENABLED=true
export VITE_APP_SAML_COGNITO_DOMAIN_NAME=your-preferred-name.auth.ap-northeast-1.amazoncognito.com
export VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PROVIDER_NAME=EntraID
export VITE_APP_AGENT_NAMES=["SearchEngine"]
```

#### Using .env Files

The frontend is built using Vite, which allows you to set environment variables using `.env` files ([reference](https://vitejs.dev/guide/env-and-mode#env-files)). Create a `/packages/web/.env` file and set the same variables as in the "Setting Shell Variables with export" method above. Note that you don't need to include `export` in the `.env` file.

```bash
VITE_APP_API_ENDPOINT=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/api/
VITE_APP_REGION=ap-northeast-1
### Omitted below ###
```

#### Starting the Local Server

After setting the environment variables, run the following command:

```bash
npm run web:dev
```

If everything is set up correctly, the server will start at http://localhost:5173, and you can access it from your browser.

## Submitting a Pull Request

Bug fixes and feature improvements are welcome as Pull Requests. Before committing, please run the lint tool:

```bash
npm run lint
```
