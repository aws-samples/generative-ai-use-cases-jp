#!/bin/bash
# deploy-with-idc.sh
#
# AWS IAM Identity Center (IdC)を使用してCDKをデプロイするためのスクリプト
# 使用方法: ./deploy-with-idc.sh [プロファイル名]
#
# 例: ./deploy-with-idc.sh genu

# デフォルトプロファイル設定
DEFAULT_PROFILE="genu"
PROFILE=${1:-$DEFAULT_PROFILE}

echo "🔑 AWS IAM Identity Center (IdC)認証を開始します..."
echo "📋 使用するプロファイル: $PROFILE"

# SSOセッションを開始
echo "🔄 IdCログインを実行中..."
aws sso login --profile $PROFILE

# ログイン成功の確認
if [ $? -ne 0 ]; then
    echo "❌ IdCログインに失敗しました。プロファイル名を確認してください。"
    exit 1
fi

# アカウント情報を取得
echo "🔍 AWS認証情報を確認中..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile $PROFILE)
REGION=$(aws configure get region --profile $PROFILE)

if [ -z "$ACCOUNT_ID" ]; then
    echo "❌ アカウントIDの取得に失敗しました。"
    exit 1
fi

echo "✅ 認証成功: アカウントID $ACCOUNT_ID, リージョン $REGION"

# 環境変数を設定
export CDK_DEFAULT_ACCOUNT=$ACCOUNT_ID
export CDK_DEFAULT_REGION=$REGION
export AWS_PROFILE=$PROFILE

echo "🚀 CDKデプロイを開始します..."
npm run cdk:deploy:quick

# デプロイ結果の確認
if [ $? -eq 0 ]; then
    echo "✅ CDKデプロイが正常に完了しました！"
else
    echo "❌ CDKデプロイ中にエラーが発生しました。"
    exit 1
fi

echo "📝 注意: IdCセッションの有効期限は通常8時間です。期限切れの場合は再度このスクリプトを実行してください。"
