import * as lambda from 'aws-lambda';
import {
  RetrieveCommand,
  RetrievalFilter,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { RetrieveKnowledgeBaseRequest } from 'generative-ai-use-cases';
import { initBedrockAgentRuntimeClient } from './utils/bedrockClient';
import {
  hiddenStaticExplicitFilters,
  getDynamicFilters,
} from '@generative-ai-use-cases/common';
import { verifyToken } from './utils/auth';

const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;
const MODEL_REGION = process.env.MODEL_REGION as string;

// Supported operators for simple filter format
// = : equals, != : notEquals, > : greaterThan, < : lessThan
// >= : greaterThanOrEquals, <= : lessThanOrEquals
// ~= : stringContains, ^= : startsWith
// @ : in (values separated by |), !@ : notIn
const OPERATORS = [
  { symbol: '>=', name: 'greaterThanOrEquals' },
  { symbol: '<=', name: 'lessThanOrEquals' },
  { symbol: '!=', name: 'notEquals' },
  { symbol: '~=', name: 'stringContains' },
  { symbol: '^=', name: 'startsWith' },
  { symbol: '!@', name: 'notIn' },
  { symbol: '=', name: 'equals' },
  { symbol: '>', name: 'greaterThan' },
  { symbol: '<', name: 'lessThan' },
  { symbol: '@', name: 'in' },
] as const;

type OperatorName = (typeof OPERATORS)[number]['name'];

/**
 * Parse a simple filter string into RetrievalFilter array
 * @param filterStr Filter string (e.g., "category=AWS,year>2020")
 * @returns Array of RetrievalFilter
 * @throws Error if filter syntax is invalid
 */
const parseSimpleFilter = (filterStr: string): RetrievalFilter[] => {
  if (!filterStr || filterStr.trim() === '') {
    return [];
  }

  const filters: RetrievalFilter[] = [];
  const conditions = filterStr.split(',');

  for (const condition of conditions) {
    const trimmed = condition.trim();
    if (trimmed === '') {
      throw new Error('Empty condition found');
    }

    // Find the operator
    let foundOperator: (typeof OPERATORS)[number] | undefined;
    let operatorIndex = -1;

    for (const op of OPERATORS) {
      const idx = trimmed.indexOf(op.symbol);
      if (idx > 0) {
        foundOperator = op;
        operatorIndex = idx;
        break;
      }
    }

    if (!foundOperator || operatorIndex <= 0) {
      throw new Error(
        `Invalid condition: '${trimmed}'. Expected format: key=value`
      );
    }

    const key = trimmed.substring(0, operatorIndex).trim();
    const valueStr = trimmed
      .substring(operatorIndex + foundOperator.symbol.length)
      .trim();

    if (key === '') {
      throw new Error(`Empty key in condition: '${trimmed}'`);
    }

    if (valueStr === '') {
      throw new Error(`Empty value in condition: '${trimmed}'`);
    }

    // Build the filter based on operator
    const filter = buildFilter(key, valueStr, foundOperator.name);
    filters.push(filter);
  }

  return filters;
};

/**
 * Build a RetrievalFilter from key, value, and operator
 * Note: Using 'as unknown as RetrievalFilter' due to AWS SDK's complex union type
 */
const buildFilter = (
  key: string,
  valueStr: string,
  operatorName: OperatorName
): RetrievalFilter => {
  // For 'in' and 'notIn', values are separated by |
  if (operatorName === 'in' || operatorName === 'notIn') {
    const values = valueStr.split('|').map((v) => v.trim());
    return {
      [operatorName]: {
        key,
        value: values,
      },
    } as unknown as RetrievalFilter;
  }

  // For numeric operators, try to parse as number
  if (
    operatorName === 'greaterThan' ||
    operatorName === 'lessThan' ||
    operatorName === 'greaterThanOrEquals' ||
    operatorName === 'lessThanOrEquals'
  ) {
    const numValue = Number(valueStr);
    if (isNaN(numValue)) {
      throw new Error(
        `Invalid value type: '${valueStr}' is not a number for operator '${operatorName}'`
      );
    }
    return {
      [operatorName]: {
        key,
        value: numValue,
      },
    } as unknown as RetrievalFilter;
  }

  // For equals/notEquals, try to parse as number or boolean, otherwise use string
  if (operatorName === 'equals' || operatorName === 'notEquals') {
    let value: string | number | boolean = valueStr;

    // Try to parse as number
    const numValue = Number(valueStr);
    if (!isNaN(numValue)) {
      value = numValue;
    } else if (valueStr.toLowerCase() === 'true') {
      value = true;
    } else if (valueStr.toLowerCase() === 'false') {
      value = false;
    }

    return {
      [operatorName]: {
        key,
        value,
      },
    } as unknown as RetrievalFilter;
  }

  // For string operators (stringContains, startsWith)
  return {
    [operatorName]: {
      key,
      value: valueStr,
    },
  } as unknown as RetrievalFilter;
};

/**
 * Get aggregated explicit filters from various sources
 */
const getExplicitFilters = async (
  filterStr?: string,
  idToken?: string
): Promise<RetrievalFilter | undefined> => {
  // Parse user-provided filter
  const userFilters = filterStr ? parseSimpleFilter(filterStr) : [];

  // Get dynamic filters from idToken
  let dynamicFilters: RetrievalFilter[] = [];
  if (idToken) {
    try {
      const payload = await verifyToken(idToken);
      if (payload) {
        dynamicFilters = getDynamicFilters(payload);
      }
    } catch (e) {
      console.warn('Failed to verify token for dynamic filters:', e);
      // Continue without dynamic filters
    }
  }

  // Aggregate all filters
  const aggregatedFilters: RetrievalFilter[] = [
    ...hiddenStaticExplicitFilters,
    ...dynamicFilters,
    ...userFilters,
  ];

  if (aggregatedFilters.length === 0) {
    return undefined;
  } else if (aggregatedFilters.length === 1) {
    return aggregatedFilters[0];
  } else {
    return {
      andAll: aggregatedFilters,
    };
  }
};

exports.handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const req = JSON.parse(event.body!) as RetrieveKnowledgeBaseRequest;
    const { query, filter, idToken } = req;

    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'query is not specified' }),
      };
    }

    // Parse and validate filter
    let explicitFilters: RetrievalFilter | undefined;
    try {
      explicitFilters = await getExplicitFilters(filter, idToken);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Invalid filter syntax: ${(e as Error).message}`,
          details: {
            filter,
            hint: 'Expected format: key=value (e.g., category=AWS,year>2020,tag@AWS|Bedrock)',
          },
        }),
      };
    }

    const client = await initBedrockAgentRuntimeClient({
      region: MODEL_REGION,
    });
    const retrieveCommand = new RetrieveCommand({
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: 10,
          overrideSearchType: 'HYBRID',
          filter: explicitFilters,
        },
      },
    });
    const retrieveRes = await client.send(retrieveCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(retrieveRes),
    };
  } catch (e) {
    console.error('Error in retrieveKnowledgeBase:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve from Knowledge Base',
        details: (e as Error).message,
      }),
    };
  }
};
