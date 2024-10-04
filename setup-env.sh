#!/bin/bash

set -eu

STACK_NAME='GenerativeAiUseCasesStack'
TEMP_FILE="./generative_ai_use_cases_cloudformation_output.json"

function extract_value {
    jq -r ".Stacks[0].Outputs[] | select(.OutputKey==\"$1\") | .OutputValue" "$TEMP_FILE"
}

# CloudFormationの出力をファイルに保存
aws cloudformation describe-stacks --stack-name $STACK_NAME --output json > "$TEMP_FILE"

export VITE_APP_API_ENDPOINT=$(extract_value 'ApiEndpoint')
export VITE_APP_REGION=$(extract_value 'Region')
export VITE_APP_USER_POOL_ID=$(extract_value 'UserPoolId')
export VITE_APP_USER_POOL_CLIENT_ID=$(extract_value 'UserPoolClientId')
export VITE_APP_IDENTITY_POOL_ID=$(extract_value 'IdPoolId')
export VITE_APP_PREDICT_STREAM_FUNCTION_ARN=$(extract_value 'PredictStreamFunctionArn')
export VITE_APP_PROMPT_FLOW_STREAM_FUNCTION_ARN=$(extract_value 'InvokePromptFlowFunctionArn')
export VITE_APP_PROMPT_FLOWS=$(extract_value 'PromptFlows')
export VITE_APP_RAG_ENABLED=$(extract_value 'RagEnabled')
export VITE_APP_RAG_KNOWLEDGE_BASE_ENABLED=$(extract_value 'RagKnowledgeBaseEnabled')
export VITE_APP_AGENT_ENABLED=$(extract_value 'AgentEnabled')
export VITE_APP_SELF_SIGN_UP_ENABLED=$(extract_value 'SelfSignUpEnabled')
export VITE_APP_MODEL_REGION=$(extract_value 'ModelRegion')
export VITE_APP_MODEL_IDS=$(extract_value 'ModelIds')
export VITE_APP_MULTI_MODAL_MODEL_IDS=$(extract_value 'MultiModalModelIds')
export VITE_APP_IMAGE_MODEL_IDS=$(extract_value 'ImageGenerateModelIds')
export VITE_APP_ENDPOINT_NAMES=$(extract_value 'EndpointNames')
export VITE_APP_SAMLAUTH_ENABLED=$(extract_value 'SamlAuthEnabled')
export VITE_APP_SAML_COGNITO_DOMAIN_NAME=$(extract_value 'SamlCognitoDomainName')
export VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PROVIDER_NAME=$(extract_value 'SamlCognitoFederatedIdentityProviderName')
export VITE_APP_AGENT_NAMES=$(extract_value 'AgentNames')
export VITE_APP_RECOGNIZE_FILE_ENABLED=$(extract_value 'RecognizeFileEnabled')

# 一時ファイルを削除
rm "$TEMP_FILE"
