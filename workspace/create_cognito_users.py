#!/usr/bin/env python3
"""
Cognito User Pool にデモユーザーを一括作成するスクリプト

このスクリプトは、GenerativeAiUseCasesStack の CloudFormation Output から
UserPoolId を自動取得し、demo001〜demo080 のユーザーを作成します。

使い方:
  pip install boto3
  python create_cognito_users.py

環境変数 (オプション):
  AWS_PROFILE  - AWS CLI プロファイル名
  AWS_REGION   - AWS リージョン (デフォルト: ap-northeast-1)
  STACK_NAME   - CloudFormation スタック名 (デフォルト: GenerativeAiUseCasesStack)
"""

import boto3
import os
import sys

# === 設定 ===
STACK_NAME = os.environ.get("STACK_NAME", "GenerativeAiUseCasesStack")
REGION = os.environ.get("AWS_REGION", "ap-northeast-1")
PASSWORD = "DemoPassword01!"
EMAIL_DOMAIN = "demo.local"
USER_COUNT = 80  # demo001 〜 demo080


def get_user_pool_id(cf_client):
    """CloudFormation Output から UserPoolId を取得"""
    try:
        resp = cf_client.describe_stacks(StackName=STACK_NAME)
        outputs = resp["Stacks"][0]["Outputs"]
        for out in outputs:
            if out["OutputKey"] == "UserPoolId":
                return out["OutputValue"]
        print(f"エラー: スタック '{STACK_NAME}' に UserPoolId の Output が見つかりません。")
        sys.exit(1)
    except cf_client.exceptions.ClientError as e:
        print(f"エラー: スタック '{STACK_NAME}' の取得に失敗しました: {e}")
        sys.exit(1)


def create_user(cognito_client, user_pool_id, email, password):
    """Cognito User Pool にユーザーを作成してパスワードを確定させる"""
    try:
        # ユーザー作成
        cognito_client.admin_create_user(
            UserPoolId=user_pool_id,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
            ],
            MessageAction="SUPPRESS",  # 招待メールを送らない
        )
    except cognito_client.exceptions.UsernameExistsException:
        print(f"  スキップ (既に存在): {email}")
        # 既存ユーザーでもパスワードは設定し直す
    except Exception as e:
        print(f"  失敗 (作成): {email} - {e}")
        return False

    try:
        # パスワードを固定値に設定 (CONFIRMED 状態にする)
        cognito_client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=email,
            Password=password,
            Permanent=True,
        )
    except Exception as e:
        print(f"  失敗 (パスワード設定): {email} - {e}")
        return False

    return True


def main():
    session = boto3.Session(region_name=REGION)
    cf_client = session.client("cloudformation")
    cognito_client = session.client("cognito-idp")

    print(f"スタック '{STACK_NAME}' から UserPoolId を取得中...")
    user_pool_id = get_user_pool_id(cf_client)
    print(f"UserPoolId: {user_pool_id}")
    print()

    success_count = 0
    fail_count = 0

    for i in range(1, USER_COUNT + 1):
        email = f"demo{i:03d}@{EMAIL_DOMAIN}"
        result = create_user(cognito_client, user_pool_id, email, PASSWORD)
        if result:
            success_count += 1
            print(f"  作成完了: {email}")
        else:
            fail_count += 1

    print()
    print("=" * 50)
    print(f"完了: 成功={success_count}, 失敗={fail_count}")
    print()
    print("作成したユーザー一覧:")
    print(f"{'Email':<30} {'Password':<20}")
    print("-" * 50)
    for i in range(1, USER_COUNT + 1):
        email = f"demo{i:03d}@{EMAIL_DOMAIN}"
        print(f"{email:<30} {PASSWORD:<20}")


if __name__ == "__main__":
    main()
