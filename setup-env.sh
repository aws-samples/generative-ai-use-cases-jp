#!/bin/bash

set -eu

STACK_NAME='GenerativeAiUseCasesStack'

function extract_value {
    echo $1 | jq -r ".Stacks[0].Outputs[] | select(.OutputKey==\"$2\") | .OutputValue"
}

stack_output=`aws cloudformation describe-stacks --stack-name $STACK_NAME --output json`

export VITE_APP_API_ENDPOINT=`extract_value "$stack_output" 'ApiEndpoint'`
export VITE_APP_REGION=`extract_value "$stack_output" 'Region'`
export VITE_APP_USER_POOL_ID=`extract_value "$stack_output" 'UserPoolId'`
export VITE_APP_USER_POOL_CLIENT_ID=`extract_value "$stack_output" 'UserPoolClientId'`
export VITE_APP_IDENTITY_POOL_ID=`extract_value "$stack_output" 'IdPoolId'`
export VITE_APP_PREDICT_STREAM_FUNCTION_ARN=`extract_value "$stack_output" PredictStreamFunctionArn`
export VITE_APP_PROMPT_FLOW_STREAM_FUNCTION_ARN=`extract_value "$stack_output" 'InvokePromptFlowFunctionArn'`
export VITE_APP_PROMPT_FLOWS=`extract_value "$stack_output" 'PromptFlows' | base64 -d`
export VITE_APP_RAG_ENABLED=`extract_value "$stack_output" RagEnabled`
export VITE_APP_RAG_KNOWLEDGE_BASE_ENABLED=`extract_value "$stack_output" RagKnowledgeBaseEnabled`
export VITE_APP_AGENT_ENABLED=`extract_value "$stack_output" AgentEnabled`
export VITE_APP_SELF_SIGN_UP_ENABLED=`extract_value "$stack_output" SelfSignUpEnabled`
export VITE_APP_MODEL_REGION=`extract_value "$stack_output" ModelRegion`
export VITE_APP_MODEL_IDS=`extract_value "$stack_output" ModelIds`
export VITE_APP_IMAGE_MODEL_IDS=`extract_value "$stack_output" ImageGenerateModelIds`
export VITE_APP_ENDPOINT_NAMES=`extract_value "$stack_output" EndpointNames`
export VITE_APP_SAMLAUTH_ENABLED=`extract_value "$stack_output" SamlAuthEnabled`
export VITE_APP_SAML_COGNITO_DOMAIN_NAME=`extract_value "$stack_output" SamlCognitoDomainName`
export VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PROVIDER_NAME=`extract_value "$stack_output" SamlCognitoFederatedIdentityProviderName`
export VITE_APP_AGENT_NAMES=`extract_value "$stack_output" AgentNames`
export VITE_APP_USE_CASE_BUILDER_ENABLED=`extract_value "$stack_output" UseCaseBuilderEnabled`
export VITE_APP_OPTIMIZE_PROMPT_FUNCTION_ARN=`extract_value "$stack_output" OptimizePromptFunctionArn`
