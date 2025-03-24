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

# コマンド引数の処理
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
            shift 2
            ;;
        -h|--help)
            echo "-c, --cdk-context    ... Path to the cdk.json file"
            echo "-p, --parameter-file ... Path to the parameter.ts file"
            echo "-e, --env           ... Environment name (e.g., dev, prod)"
            echo "-h, --help          ... Show this message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ファイルの存在チェック
if [[ -n "$cdk_context_path" && ! -f "$cdk_context_path" ]]; then
    echo "Error: CDK context file not found: $cdk_context_path"
    exit 1
fi

if [[ -n "$parameter_file_path" && ! -f "$parameter_file_path" ]]; then
    echo "Error: Parameter file not found: $parameter_file_path"
    exit 1
fi

pushd /tmp

# /tmp に存在するリポジトリを念の為削除
rm -rf generative-ai-use-cases-jp

# GenU を clone
git clone https://github.com/aws-samples/generative-ai-use-cases-jp

pushd generative-ai-use-cases-jp

# npm パッケージのインストール
npm ci

# cdk.json が指定されている場合は上書きする
if [[ -n "$cdk_context_path" ]]; then
    echo "Overwrite the cdk.json by $cdk_context_path"
    cp -f $cdk_context_path packages/cdk/cdk.json
fi

# parameter.ts が指定されている場合は上書きする
if [[ -n "$parameter_file_path" ]]; then
    echo "Overwrite the parameter.ts by $parameter_file_path"
    cp -f $parameter_file_path packages/cdk/parameter.ts
fi

# CDK の bootstrap
npx -w packages/cdk cdk bootstrap

# デプロイコマンドの構築
deploy_cmd="npm run cdk:deploy:quick"

# 環境名が指定されている場合、デプロイコマンドに追加
if [[ -n "$env_name" ]]; then
    deploy_cmd="$deploy_cmd -- -c env=$env_name"
fi

# デプロイの実行
$deploy_cmd

# デプロイした CloudFront の url を取得
weburl=`aws cloudformation describe-stacks --stack-name GenerativeAiUseCasesStack --output json | jq -r ".Stacks[0].Outputs[] | select(.OutputKey==\"WebUrl\") | .OutputValue"`

echo "*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*"
echo "Welcome to GenU: $weburl"
echo "*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*"
