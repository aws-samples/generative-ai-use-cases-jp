#!/bin/bash

set -e

# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=800"

echo "----------------------------"
echo "  _____            _    _   "
echo " / ____|          | |  | |  "
echo "| |  __  ___ _ __ | |  | |  "
echo "| | |_ |/ _ \ '_ \| |  | |  "
echo "| |__| |  __/ | | | |__| |  "
echo " \_____|\___|_| |_|\____/   "
echo "      DESTROY STACKS        "
echo "----------------------------"

# Process command arguments
env_name_provided=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        -c|--cdk-context)
            cdk_context_path="$2"
            shift 2
            ;;
        -p|--parameter-file)
            parameter_file_path="$2"
            shift 2
            ;;
        -e|--env)
            env_name="$2"
            env_name_provided=true
            shift 2
            ;;
        -y|--yes)
            skip_confirmation=true
            shift
            ;;
        -h|--help)
            echo "-c, --cdk-context    ... Path to the cdk.json file"
            echo "-p, --parameter-file ... Path to the parameter.ts file"
            echo "-e, --env           ... Environment name (e.g., dev, prod)"
            echo "-y, --yes           ... Skip confirmation prompt"
            echo "-h, --help          ... Show this message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if the file exists
if [[ -n "$cdk_context_path" && ! -f "$cdk_context_path" ]]; then
    echo "Error: CDK context file not found: $cdk_context_path"
    exit 1
fi

if [[ -n "$parameter_file_path" && ! -f "$parameter_file_path" ]]; then
    echo "Error: Parameter file not found: $parameter_file_path"
    exit 1
fi

pushd /tmp

# Delete the repository in /tmp if it exists
rm -rf generative-ai-use-cases

# Clone GenU
git clone https://github.com/aws-samples/generative-ai-use-cases

pushd generative-ai-use-cases

# Install npm packages
npm ci

# If cdk.json is specified, use it
if [[ -n "$cdk_context_path" ]]; then
    echo "Using provided cdk.json from $cdk_context_path"
    cp -f $cdk_context_path packages/cdk/cdk.json
fi

# If parameter.ts is specified, use it
if [[ -n "$parameter_file_path" ]]; then
    echo "Using provided parameter.ts from $parameter_file_path"
    cp -f $parameter_file_path packages/cdk/parameter.ts
fi

# Determine environment name if not specified
if [[ "$env_name_provided" == false ]]; then
    # Get all GenU stacks (sorted alphabetically for deterministic behavior)
    STACK_NAMES=$(aws cloudformation list-stacks \
      --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
      --query 'sort_by(StackSummaries[?starts_with(StackName, `GenerativeAiUseCasesStack`)], &StackName)[].StackName' \
      --output text)
    
    # Count number of stacks
    STACK_COUNT=$(echo "$STACK_NAMES" | awk 'NF' | wc -w)
    
    if [[ $STACK_COUNT -eq 0 ]]; then
        echo "Error: No GenU stacks found in this account"
        exit 1
    elif [[ $STACK_COUNT -gt 1 ]]; then
        # Multiple stacks - require explicit environment
        echo ""
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║  ⚠️  ERROR: Multiple GenU environments detected               ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Found $STACK_COUNT GenU deployments in this account:"
        echo ""
        
        # Display all environments
        IFS=$'\t' read -ra STACK_ARRAY <<< "$STACK_NAMES"
        for stack in "${STACK_ARRAY[@]}"; do
            env="${stack#GenerativeAiUseCasesStack}"
            echo "  • ${env:-default} (Stack: $stack)"
        done
        
        echo ""
        echo "To prevent accidental deletion, you must explicitly specify"
        echo "which environment to destroy using the -e flag:"
        echo ""
        echo "  ./destroy.sh -e <environment-name>"
        echo ""
        echo "Examples:"
        for stack in "${STACK_ARRAY[@]}"; do
            env="${stack#GenerativeAiUseCasesStack}"
            if [[ -z "$env" ]]; then
                echo "  ./destroy.sh -e \"\""
            else
                echo "  ./destroy.sh -e $env"
            fi
        done
        echo ""
        exit 1
    else
        # Single stack - auto-select
        STACK_NAME=$(echo "$STACK_NAMES" | awk '{print $1}')
        env_name="${STACK_NAME#GenerativeAiUseCasesStack}"
        echo "Detected environment from stack: ${env_name:-default}"
    fi
fi

# If environment is specified, update parameter.ts
if [[ -n "$env_name" && -z "$parameter_file_path" ]]; then
    echo "Using parameter.ts for environment: $env_name"
    
    # Get stack outputs to populate parameter.ts
    STACK_NAME="GenerativeAiUseCasesStack${env_name}"
    
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &>/dev/null; then
        echo "Extracting configuration from stack: $STACK_NAME"
        
        # Helper function to extract CloudFormation output values
        function extract_value {
            echo $1 | jq -r ".Stacks[0].Outputs[] | select(.OutputKey==\"$2\") | .OutputValue"
        }
        
        # Get stack outputs
        stack_output=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --output json)
        
        # Extract all configuration values
        MODEL_REGION=$(extract_value "$stack_output" ModelRegion)
        MODEL_IDS=$(extract_value "$stack_output" ModelIds)
        IMAGE_MODEL_IDS=$(extract_value "$stack_output" ImageGenerateModelIds)
        VIDEO_MODEL_IDS=$(extract_value "$stack_output" VideoGenerateModelIds)
        SPEECH_MODEL_IDS=$(extract_value "$stack_output" SpeechToSpeechModelIds)
        ENDPOINT_NAMES=$(extract_value "$stack_output" EndpointNames)
        RAG_ENABLED=$(extract_value "$stack_output" RagEnabled)
        RAG_KB_ENABLED=$(extract_value "$stack_output" RagKnowledgeBaseEnabled)
        AGENT_ENABLED=$(extract_value "$stack_output" AgentEnabled)
        SELF_SIGNUP=$(extract_value "$stack_output" SelfSignUpEnabled)
        SAML_ENABLED=$(extract_value "$stack_output" SamlAuthEnabled)
        SAML_DOMAIN=$(extract_value "$stack_output" SamlCognitoDomainName)
        SAML_PROVIDER=$(extract_value "$stack_output" SamlCognitoFederatedIdentityProviderName)
        AGENTS=$(extract_value "$stack_output" Agents | base64 -d 2>/dev/null || echo "[]")
        INLINE_AGENTS=$(extract_value "$stack_output" InlineAgents)
        USE_CASE_BUILDER=$(extract_value "$stack_output" UseCaseBuilderEnabled)
        HIDDEN_USE_CASES=$(extract_value "$stack_output" HiddenUseCases)
        FLOWS=$(extract_value "$stack_output" Flows | base64 -d 2>/dev/null || echo "[]")
        MCP_ENABLED=$(extract_value "$stack_output" McpEnabled)
        AGENT_CORE_ENABLED=$(extract_value "$stack_output" AgentCoreEnabled)
        AGENT_BUILDER_ENABLED=$(extract_value "$stack_output" AgentCoreAgentBuilderEnabled)
        AGENT_CORE_EXTERNAL=$(extract_value "$stack_output" AgentCoreExternalRuntimes)
        
        # Update parameter.ts
        export env_name MODEL_REGION MODEL_IDS IMAGE_MODEL_IDS VIDEO_MODEL_IDS SPEECH_MODEL_IDS ENDPOINT_NAMES
        export RAG_ENABLED RAG_KB_ENABLED AGENT_ENABLED SELF_SIGNUP SAML_ENABLED SAML_DOMAIN SAML_PROVIDER
        export AGENTS INLINE_AGENTS FLOWS MCP_ENABLED USE_CASE_BUILDER HIDDEN_USE_CASES
        export AGENT_CORE_ENABLED AGENT_BUILDER_ENABLED AGENT_CORE_EXTERNAL
        
        node <<'NODESCRIPT'
const fs = require('fs');
let content = fs.readFileSync('packages/cdk/parameter.ts', 'utf8');

const filterInferenceProfileArn = (models) => {
  return models.map(({ inferenceProfileArn, ...rest }) => rest);
};

const envParams = {
  modelRegion: process.env.MODEL_REGION,
  modelIds: filterInferenceProfileArn(JSON.parse(process.env.MODEL_IDS)),
  imageGenerationModelIds: filterInferenceProfileArn(JSON.parse(process.env.IMAGE_MODEL_IDS)),
  videoGenerationModelIds: filterInferenceProfileArn(JSON.parse(process.env.VIDEO_MODEL_IDS)),
  speechToSpeechModelIds: filterInferenceProfileArn(JSON.parse(process.env.SPEECH_MODEL_IDS)),
  endpointNames: filterInferenceProfileArn(JSON.parse(process.env.ENDPOINT_NAMES)),
  ragEnabled: process.env.RAG_ENABLED === 'true',
  ragKnowledgeBaseEnabled: process.env.RAG_KB_ENABLED === 'true',
  agentEnabled: process.env.AGENT_ENABLED === 'true',
  selfSignUpEnabled: process.env.SELF_SIGNUP === 'true',
  samlAuthEnabled: process.env.SAML_ENABLED === 'true',
  samlCognitoDomainName: process.env.SAML_DOMAIN,
  samlCognitoFederatedIdentityProviderName: process.env.SAML_PROVIDER,
  agents: JSON.parse(process.env.AGENTS),
  inlineAgents: process.env.INLINE_AGENTS === 'true',
  flows: JSON.parse(process.env.FLOWS),
  mcpEnabled: process.env.MCP_ENABLED === 'true',
  useCaseBuilderEnabled: process.env.USE_CASE_BUILDER === 'true',
  hiddenUseCases: JSON.parse(process.env.HIDDEN_USE_CASES),
  createGenericAgentCoreRuntime: process.env.AGENT_CORE_ENABLED === 'true',
  agentBuilderEnabled: process.env.AGENT_BUILDER_ENABLED === 'true',
  agentCoreExternalRuntimes: JSON.parse(process.env.AGENT_CORE_EXTERNAL)
};

const envParamsStr = JSON.stringify(envParams, null, 2);
const regex = new RegExp(`${process.env.env_name}:\\s*\\{[\\s\\S]*?\\n  \\}`, 'm');
content = content.replace(regex, `${process.env.env_name}: ${envParamsStr}`);

fs.writeFileSync('packages/cdk/parameter.ts', content);
NODESCRIPT
        
        echo "Updated parameter.ts with stack configuration"
    fi
fi

# List target stacks
echo ""
echo "Target stacks to be deleted:"
if [[ -n "$env_name" ]]; then
    npx -w packages/cdk cdk ls -c env="$env_name"
else
    npx -w packages/cdk cdk ls
fi
echo ""

# Confirmation prompt
if [[ "$skip_confirmation" != true ]]; then
    echo "WARNING: This will permanently delete all GenU stacks and resources."
    if [[ -n "$env_name" ]]; then
        echo "Environment: $env_name"
    else
        echo "Environment: default"
    fi
    echo "This action cannot be undone."
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirmation

    if [[ "$confirmation" != "yes" ]]; then
        echo "Destroy operation cancelled."
        exit 0
    fi
fi

# Build destroy command
destroy_cmd="npm run cdk:destroy -- --force"

# Pass environment via context flag if specified
if [[ -n "$env_name" ]]; then
    destroy_cmd="$destroy_cmd -c env=$env_name"
fi

# Execute destroy
$destroy_cmd

echo "*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*"
echo "GenU has been successfully destroyed"
echo "*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*"
