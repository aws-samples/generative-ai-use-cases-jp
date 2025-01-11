import {
  MetadataAttributeSchema,
  RetrievalFilter,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { ExplicitFilterConfiguration } from 'generative-ai-use-cases-jp';
import { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';

/*
 * This file is used to define filters for the knowledge base. Feel free to uncomment the filters and customize them to suit your needs.
 * このファイルは、Knowledge Basesフィルタを定義するために使用されます。フィルタをコメントアウトして、必要に応じてカスタマイズしてください。
 *
 * サンプルのファイル (packages/cdk/rag-docs/docs) の metadata.json を参考にドキュメントのメタデータを事前に定義し、メタデータに合わせたフィルタを以下で定義してください。
 */

// Dynamic Filter
// Filter automatically applied by user attribute
// ユーザー属性によって自動的に適用されるフィルタを定義する
export const getDynamicFilters = (
  _idTokenPayload: CognitoIdTokenPayload
): RetrievalFilter[] => {
  const dynamicFilters: RetrievalFilter[] = [];

  // Example 1: Filter by cognito user group
  // Cognito のユーザーグループによってフィルタを適用する

  // const groups = idTokenPayload['cognito:groups'];
  // if (!groups) throw new Error('cognito:groups is not set'); // Group が設定されていない場合はアクセスできずにエラーにする
  // const groupFilter: RetrievalFilter = {
  //   in: {
  //     key: 'group',
  //     value: groups,
  //   },
  // };
  // dynamicFilters.push(groupFilter);

  // Example 2: Filter by SAML IdP group custom attribute (Check steps to setup attribute mapping in docs/SAML_WITH_ENTRA_ID.md)
  // SAML IdP グループのカスタム属性によってフィルタを適用する
  // カスタム属性の設定方法は docs/SAML_WITH_ENTRA_ID.md を参照してください

  // const groups = (idTokenPayload['custom:idpGroup'] as string) // group を string で保持している (i.e. [group1id, group2id])
  //   .slice(1, -1) // 先頭と末尾の括弧を削除
  //   .split(/, ?/) // カンマとスペースで分割
  //   .filter(Boolean); // 空文字列を除去;
  // if (!groups) throw new Error('custom:idpGroup is not set'); // Group が設定されていない場合はアクセスできずにエラーにする
  // const groupFilter: RetrievalFilter = {
  //   in: {
  //     key: 'group',
  //     value: groups,
  //   },
  // };
  // dynamicFilters.push(groupFilter);

  return dynamicFilters;
};

// Implicit Filter
// Parsed by AI, not shown to user (Claude Sonnet 3.5 is used and may cause throttling error)
// AI によって解析されリクエストに応じてフィルタを自動で適用します。その際に適用可能なフィルタを定義します。 (Claude Sonnet 3.5 が使用されます。スロットリングエラーが発生する可能性があります)
export const implicitFilters: MetadataAttributeSchema[] = [
  // Example 1: Filter by year
  // {
  //   key: 'year',
  //   type: 'NUMBER',
  //   description: 'Filter by year',
  // },
  // Customize Here
];

// Hidden Static Explicit Filter
// Filter not shown to user (i.e. application level permission, pool tenant)
// ユーザーには表示されないフィルタを定義する (i.e. アプリケーションレベルの権限, プールテナント)
export const hiddenStaticExplicitFilters: RetrievalFilter[] = [
  // Example 1: Filter by data classification
  // {
  //   notIn: {
  //     key: 'classification',
  //     value: ['secret'],
  //   },
  // },
  // Example 2: Filter by tenant
  // {
  //   equals: {
  //     key: 'tenant',
  //     value: 'tenant1',
  //   },
  // },
  // Customize Here
];

// User Defined Explicit Filter
// Filter shown to user on application
// ユーザーが UI 上で選択できるフィルタを定義する
// サンプルファイル (packages/cdk/rag-docs/docs) で定義されている metadata.json に合わせて定義しています。
export const userDefinedExplicitFilters: ExplicitFilterConfiguration[] = [
  // Example 1: Filter by category (string match)
  {
    key: 'category',
    type: 'STRING',
    options: [{ value: 'AWS', label: 'AWS' }],
    description: 'カテゴリ',
  },

  // Example 2: Filter by tag (string list)
  {
    key: 'tag',
    type: 'STRING_LIST',
    options: [
      { value: 'AWS', label: 'AWS' },
      { value: 'Amazon Bedrock', label: 'Amazon Bedrock' },
      { value: 'Amazon SageMaker', label: 'Amazon SageMaker' },
    ],
    description: 'タグ',
  },

  // Example 3: Filter by year (number)
  {
    key: 'year',
    type: 'NUMBER',
    description: '年',
  },

  // Example 4: Filter by is_public (boolean)
  {
    key: 'is_public',
    type: 'BOOLEAN',
    options: [
      { value: 'true', label: '公開' },
      { value: 'false', label: '非公開' },
    ],
    description: '公開',
  },

  // Customize Here
];
