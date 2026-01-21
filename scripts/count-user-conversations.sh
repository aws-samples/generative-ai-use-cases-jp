#!/bin/bash
#
# 期間を指定して、ユーザごとの会話スレッド数をカウントするスクリプト
#
# 使用方法:
#   ./count-user-conversations.sh <開始日> <終了日> [スタック名]
#
# 例:
#   ./count-user-conversations.sh 2025-01-01 2025-01-31
#   ./count-user-conversations.sh 2025-01-01 2025-01-31 GenerativeAiUseCasesStack
#
# 出力:
#   ユーザーごとの会話数と合計を表示
#
# 必要な権限:
#   - dynamodb:Scan
#   - cloudformation:ListStackResources
#

set -e

# 引数チェック
if [ $# -lt 2 ]; then
    echo "使用方法: $0 <開始日> <終了日> [スタック名]"
    echo ""
    echo "例:"
    echo "  $0 2025-01-01 2025-01-31"
    echo "  $0 2025-01-01 2025-01-31 GenerativeAiUseCasesStack"
    echo ""
    echo "スタック名を省略した場合、自動検出を試みます。"
    exit 1
fi

START_DATE="$1"
END_DATE="$2"
STACK_NAME="${3:-}"

# テーブル名を自動取得する関数
get_table_name() {
    local stack="$1"

    # CloudFormationスタックのリソースからDynamoDBテーブルを検索
    # Database ConstructのTable（メインテーブル）を取得
    aws cloudformation list-stack-resources \
        --stack-name "${stack}" \
        --query "StackResourceSummaries[?ResourceType=='AWS::DynamoDB::Table' && contains(LogicalResourceId, 'Database') && contains(LogicalResourceId, 'Table') && !contains(LogicalResourceId, 'Stats')].PhysicalResourceId" \
        --output text 2>/dev/null | head -1
}

# スタック名が指定されていない場合、自動検出
if [ -z "$STACK_NAME" ]; then
    echo "スタック名を自動検出中..."

    # GenerativeAiUseCasesStack で始まるスタックを検索
    STACK_NAME=$(aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --query "StackSummaries[?starts_with(StackName, 'GenerativeAiUseCasesStack')].StackName" \
        --output text 2>/dev/null | head -1)

    if [ -z "$STACK_NAME" ]; then
        echo "エラー: GenerativeAiUseCasesStack が見つかりません。"
        echo "スタック名を引数で指定してください。"
        exit 1
    fi

    echo "検出されたスタック: ${STACK_NAME}"
fi

# テーブル名を取得
echo "テーブル名を取得中..."
TABLE_NAME=$(get_table_name "${STACK_NAME}")

if [ -z "$TABLE_NAME" ]; then
    echo "エラー: DynamoDBテーブルが見つかりません。"
    echo "スタック名を確認してください: ${STACK_NAME}"
    exit 1
fi

echo "検出されたテーブル: ${TABLE_NAME}"
echo ""

# 日時をミリ秒UNIXタイムスタンプに変換
# macOS と Linux の両方に対応
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    START_TIMESTAMP=$(date -j -f "%Y-%m-%d %H:%M:%S" "${START_DATE} 00:00:00" "+%s" 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "${START_DATE}" "+%s")000
    END_TIMESTAMP=$(date -j -f "%Y-%m-%d %H:%M:%S" "${END_DATE} 23:59:59" "+%s" 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "${END_DATE}" "+%s")999
else
    # Linux
    START_TIMESTAMP=$(date -d "${START_DATE} 00:00:00" "+%s" 2>/dev/null || date -d "${START_DATE}" "+%s")000
    END_TIMESTAMP=$(date -d "${END_DATE} 23:59:59" "+%s" 2>/dev/null || date -d "${END_DATE}" "+%s")999
fi

echo "=============================================="
echo "会話スレッド数カウント"
echo "=============================================="
echo "スタック名: ${STACK_NAME}"
echo "テーブル名: ${TABLE_NAME}"
echo "期間: ${START_DATE} ~ ${END_DATE}"
echo "タイムスタンプ範囲: ${START_TIMESTAMP} ~ ${END_TIMESTAMP}"
echo "=============================================="
echo ""

# 一時ファイル
TEMP_FILE=$(mktemp)
trap "rm -f ${TEMP_FILE}" EXIT

# DynamoDB Scanでチャットアイテムを取得（ページネーション対応）
echo "データを取得中..."

LAST_KEY=""
PAGE=1

while true; do
    echo -n "  ページ ${PAGE} を取得中..."

    if [ -z "$LAST_KEY" ]; then
        # 最初のページ
        RESPONSE=$(aws dynamodb scan \
            --table-name "${TABLE_NAME}" \
            --filter-expression "begins_with(id, :prefix) AND createdDate BETWEEN :start AND :end" \
            --expression-attribute-values "{
                \":prefix\": {\"S\": \"user#\"},
                \":start\": {\"S\": \"${START_TIMESTAMP}\"},
                \":end\": {\"S\": \"${END_TIMESTAMP}\"}
            }" \
            --projection-expression "id" \
            --output json)
    else
        # 続きのページ
        RESPONSE=$(aws dynamodb scan \
            --table-name "${TABLE_NAME}" \
            --filter-expression "begins_with(id, :prefix) AND createdDate BETWEEN :start AND :end" \
            --expression-attribute-values "{
                \":prefix\": {\"S\": \"user#\"},
                \":start\": {\"S\": \"${START_TIMESTAMP}\"},
                \":end\": {\"S\": \"${END_TIMESTAMP}\"}
            }" \
            --projection-expression "id" \
            --exclusive-start-key "${LAST_KEY}" \
            --output json)
    fi

    # アイテムを一時ファイルに追加
    echo "${RESPONSE}" | jq -r '.Items[].id.S' >> "${TEMP_FILE}"

    COUNT=$(echo "${RESPONSE}" | jq '.Items | length')
    echo " ${COUNT} 件"

    # 次のページがあるか確認
    LAST_KEY=$(echo "${RESPONSE}" | jq -r '.LastEvaluatedKey // empty')

    if [ -z "$LAST_KEY" ]; then
        break
    fi

    PAGE=$((PAGE + 1))
done

echo ""
echo "=============================================="
echo "集計結果"
echo "=============================================="
echo ""

# ユーザーごとにカウント
if [ -s "${TEMP_FILE}" ]; then
    echo "ユーザーID                                        会話数"
    echo "------------------------------------------------  ------"

    # user# プレフィックスを除去してカウント、ソート
    sort "${TEMP_FILE}" | uniq -c | sort -rn | while read -r count user_id; do
        # user# プレフィックスを除去
        user_name="${user_id#user#}"
        printf "%-48s  %6d\n" "${user_name}" "${count}"
    done

    echo "------------------------------------------------  ------"
    TOTAL=$(wc -l < "${TEMP_FILE}" | tr -d ' ')
    UNIQUE_USERS=$(sort "${TEMP_FILE}" | uniq | wc -l | tr -d ' ')
    echo ""
    echo "合計会話数: ${TOTAL}"
    echo "ユニークユーザー数: ${UNIQUE_USERS}"
else
    echo "該当する会話が見つかりませんでした。"
fi

echo ""
echo "=============================================="
