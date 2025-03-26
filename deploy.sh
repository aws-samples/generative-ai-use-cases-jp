#!/bin/bash

set -e

echo "--------------------------"
echo "  _____            _    _ "
echo " / ____|          | |  | |"
echo "| |  __  ___ _ __ | |  | |"
echo "| | |_ |/ _ \ '_ \| |  | |"
echo "| |__| |  __/ | | | |__| |"
echo " \_____|\___|_| |_|\____/ "
echo "--------------------------"

# Process command arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -c|--cdk-context)
            cdk_context_path="$2"
            shift 2
            ;;
        -h|--help)
            echo "-c, --cdk-context ... Path to the cdk.json file"
            echo "-h, --help        ... Show this message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

pushd /tmp

# Delete the repository in /tmp if it exists
rm -rf generative-ai-use-cases-jp

# Clone GenU
git clone https://github.com/aws-samples/generative-ai-use-cases-jp

pushd generative-ai-use-cases-jp

# Install npm packages
npm ci

# If cdk.json is specified, overwrite it
if [[ -n "$cdk_context_path" ]]; then
    echo "Overwrite the cdk.json by $cdk_context_path"
    cp -f $cdk_context_path packages/cdk/cdk.json
fi

# Bootstrap CDK
npx -w packages/cdk cdk bootstrap

# Execute deployment
npm run cdk:deploy:quick

# Get the url of the deployed CloudFront
weburl=`aws cloudformation describe-stacks --stack-name GenerativeAiUseCasesStack --output json | jq -r ".Stacks[0].Outputs[] | select(.OutputKey==\"WebUrl\") | .OutputValue"`

echo "*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*"
echo "Welcome to GenU: $weburl"
echo "*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*"
