import {
  MetadataAttributeSchema,
  RetrievalFilter,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { ExplicitFilterConfiguration } from 'generative-ai-use-cases-jp';
import { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';

export const getDynamicFilters = (
  idTokenPayload: CognitoIdTokenPayload
): RetrievalFilter[] => {
  const dynamicFilters: RetrievalFilter[] = [];

  // ビルドのために変数を最低1度は参照する
  console.log('idTokenPayload', idTokenPayload);

  // Example 1: Filter by cognito user group

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
// Parsed by AI, not shown to user
// Claude Sonnet 3.5 is used and may cause throttling error
export const implicitFilters: MetadataAttributeSchema[] = [
  // Customize Here
  // Example 1: Filter by year
  // {
  //   key: 'year',
  //   type: 'NUMBER',
  //   description: 'Filter by year',
  // },
];

// Hidden Static Explicit Filter
// Filter not shown to user (i.e. application level permission, pool tenant)
export const hiddenStaticExplicitFilters: RetrievalFilter[] = [
  // Customize Here
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
];

// User Defined Explicit Filter
// shown to user
export const userDefinedExplicitFilters: ExplicitFilterConfiguration[] = [
  // Customize Here

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
];
