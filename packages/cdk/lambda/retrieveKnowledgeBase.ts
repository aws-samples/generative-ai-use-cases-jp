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
import { parseSimpleFilter, aggregateFilters } from './utils/kbFilterParser';

const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;
const MODEL_REGION = process.env.MODEL_REGION as string;

/**
 * Aggregate explicit filters from various sources
 */
const getExplicitFilters = async (
  filterStr?: string,
  idToken?: string
): Promise<RetrievalFilter | undefined> => {
  // Parse user-specified filters
  const userFilters = filterStr ? parseSimpleFilter(filterStr) : [];

  // Generate dynamic filters from ID token
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

  // Aggregate all filters: hiddenStatic -> dynamic -> user
  return aggregateFilters(
    hiddenStaticExplicitFilters,
    dynamicFilters,
    userFilters
  );
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

    // Parse and validate filters
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
