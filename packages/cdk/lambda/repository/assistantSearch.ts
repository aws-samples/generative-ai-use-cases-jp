/**
 * OpenSearch Repository for Assistant RAG functionality
 * Provides vector store integration for semantic search over knowledge sources
 */

import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { OpenSearchVectorStore } from '@langchain/community/vectorstores/opensearch';
import { BedrockEmbeddings } from '@langchain/aws';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { S3Loader } from '@langchain/community/document_loaders/web/s3';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { Document } from '@langchain/core/documents';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type {
  AssistantMessageSource,
  KnowledgeSource,
  AssistantSyncStatus,
} from 'generative-ai-use-cases';

// Environment variables
const BEDROCK_REGION = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
const EMBEDDING_MODEL_ID = process.env.EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v1';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Chunking configuration
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Search configuration
const DEFAULT_TOP_K = 5;
const EXCERPT_LENGTH = 200;

/**
 * Cache entry for vector stores
 */
interface VectorStoreCache {
  store: OpenSearchVectorStore;
  timestamp: number;
}

/**
 * In-memory cache for vector store instances
 */
const vectorStoreCache = new Map<string, VectorStoreCache>();

/**
 * Get OpenSearch endpoint for a tenant
 * In production, this would come from tenant configuration
 */
function getTenantOpenSearchEndpoint(tenantId: string): string {
  const endpoint = process.env[`OPENSEARCH_ENDPOINT_${tenantId.toUpperCase()}`] ||
                   process.env.OPENSEARCH_ENDPOINT;

  if (!endpoint) {
    throw new Error(`OpenSearch endpoint not configured for tenant: ${tenantId}`);
  }

  return endpoint;
}

/**
 * Create OpenSearch client with tenant-specific credentials
 */
async function createOpenSearchClient(
  tenantId: string
): Promise<Client> {
  const endpoint = getTenantOpenSearchEndpoint(tenantId);
  const region = process.env.AWS_REGION || 'us-east-1';

  // Create client with AWS Sigv4 signing
  const client = new Client({
    ...AwsSigv4Signer({
      region,
      service: 'es',
      getCredentials: () => {
        const credentialsProvider = defaultProvider();
        return credentialsProvider();
      },
    }),
    node: endpoint.startsWith('https://') ? endpoint : `https://${endpoint}`,
  });

  return client;
}

/**
 * Get Bedrock embeddings instance
 */
function getEmbeddings(): BedrockEmbeddings {
  return new BedrockEmbeddings({
    region: BEDROCK_REGION,
    model: EMBEDDING_MODEL_ID,
  });
}

/**
 * Generate cache key for vector store
 */
function getCacheKey(assistantId: string, tenantId: string): string {
  return `${tenantId}:${assistantId}`;
}

/**
 * Get index name for an assistant
 */
function getIndexName(assistantId: string, tenantId: string): string {
  return `assistant-${tenantId}-${assistantId}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: VectorStoreCache): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Sleep utility for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function retry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) {
      throw error;
    }
    console.warn(`Retry attempt remaining: ${retries - 1}`, error);
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  }
}

/**
 * Initialize or get vector store for an assistant
 */
export async function getVectorStore(
  assistantId: string,
  tenantId: string
): Promise<OpenSearchVectorStore> {
  const cacheKey = getCacheKey(assistantId, tenantId);

  // Check cache
  const cached = vectorStoreCache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.store;
  }

  // Create new vector store
  const client = await createOpenSearchClient(tenantId);
  const embeddings = getEmbeddings();
  const indexName = getIndexName(assistantId, tenantId);

  const vectorStore = new OpenSearchVectorStore(embeddings, {
    client,
    indexName,
    vectorFieldName: 'embedding',
    textFieldName: 'text',
    metadataFieldName: 'metadata',
  });

  // Cache the vector store
  vectorStoreCache.set(cacheKey, {
    store: vectorStore,
    timestamp: Date.now(),
  });

  return vectorStore;
}

/**
 * Clear cache for an assistant
 */
function clearCache(assistantId: string, tenantId: string): void {
  const cacheKey = getCacheKey(assistantId, tenantId);
  vectorStoreCache.delete(cacheKey);
}

/**
 * Load documents from S3
 */
async function loadS3Documents(
  s3Urls: string[],
  chunkSize: number,
  chunkOverlap: number
): Promise<Document[]> {
  const documents: Document[] = [];

  for (const s3Url of s3Urls) {
    try {
      // Parse S3 URL: s3://bucket/key
      const match = s3Url.match(/^s3:\/\/([^/]+)\/(.+)$/);
      if (!match) {
        console.error(`Invalid S3 URL format: ${s3Url}`);
        continue;
      }

      const [, bucket, key] = match;

      // Load document from S3
      // Note: S3Loader requires unstructured API for some file types
      // For basic text extraction, use TextLoader or PDFLoader
      const loader = new S3Loader({
        bucket,
        key,
        unstructuredAPIURL: process.env.UNSTRUCTURED_API_URL || '',
        unstructuredAPIKey: process.env.UNSTRUCTURED_API_KEY || '',
      });

      const docs = await retry(() => loader.load());

      // Add source metadata
      docs.forEach(doc => {
        doc.metadata.source = s3Url;
        doc.metadata.sourceType = 'file';
      });

      documents.push(...docs);
    } catch (error) {
      console.error(`Failed to load S3 document: ${s3Url}`, error);
    }
  }

  // Split documents into chunks
  if (documents.length > 0) {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });

    return await textSplitter.splitDocuments(documents);
  }

  return documents;
}

/**
 * Load documents from web URLs
 */
async function loadWebDocuments(
  knowledgeSource: KnowledgeSource,
  chunkSize: number,
  chunkOverlap: number
): Promise<Document[]> {
  const documents: Document[] = [];

  if (!knowledgeSource.url) {
    return documents;
  }

  try {
    // Load web page
    const loader = new CheerioWebBaseLoader(knowledgeSource.url);
    const docs = await retry(() => loader.load());

    // Add source metadata
    docs.forEach(doc => {
      doc.metadata.source = knowledgeSource.url;
      doc.metadata.sourceName = knowledgeSource.name;
      doc.metadata.sourceType = 'url';
    });

    documents.push(...docs);

    // Handle recursive crawling if specified
    if (knowledgeSource.recursiveDepth && knowledgeSource.recursiveDepth > 0) {
      // Note: Basic implementation - in production, would use a proper crawler
      console.warn('Recursive crawling not fully implemented - only loading specified URL');
    }

    // Split documents into chunks
    if (documents.length > 0) {
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
      });

      return await textSplitter.splitDocuments(documents);
    }
  } catch (error) {
    console.error(`Failed to load web document: ${knowledgeSource.url}`, error);
  }

  return documents;
}

/**
 * Index documents from knowledge sources
 */
export async function indexKnowledgeSources(
  assistantId: string,
  tenantId: string,
  knowledgeSources: KnowledgeSource[],
  s3Urls: string[]
): Promise<{
  success: boolean;
  indexedCount: number;
  errors?: string[];
}> {
  const errors: string[] = [];
  let indexedCount = 0;

  try {
    // Clear cache to ensure fresh vector store
    clearCache(assistantId, tenantId);

    // Get vector store
    const vectorStore = await getVectorStore(assistantId, tenantId);

    // Determine chunking strategy
    const chunkingStrategy = knowledgeSources[0]?.chunkingStrategy;
    const chunkSize = chunkingStrategy?.maxTokens || CHUNK_SIZE;
    const chunkOverlap = chunkingStrategy
      ? Math.floor(chunkSize * (chunkingStrategy.overlapPercentage / 100))
      : CHUNK_OVERLAP;

    // Load documents from S3
    const s3Documents = await loadS3Documents(s3Urls, chunkSize, chunkOverlap);

    // Load documents from web sources
    const webDocuments: Document[] = [];
    for (const source of knowledgeSources) {
      if (source.sourceType === 'url') {
        const docs = await loadWebDocuments(source, chunkSize, chunkOverlap);
        webDocuments.push(...docs);
      }
    }

    // Combine all documents
    const allDocuments = [...s3Documents, ...webDocuments];

    if (allDocuments.length === 0) {
      return {
        success: true,
        indexedCount: 0,
        errors: ['No documents to index'],
      };
    }

    // Index documents in batches
    const batchSize = 100;
    for (let i = 0; i < allDocuments.length; i += batchSize) {
      const batch = allDocuments.slice(i, i + batchSize);
      try {
        await retry(() => vectorStore.addDocuments(batch));
        indexedCount += batch.length;
      } catch (error) {
        const errorMsg = `Failed to index batch ${i / batchSize + 1}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return {
      success: errors.length === 0,
      indexedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Failed to index knowledge sources:', error);
    return {
      success: false,
      indexedCount,
      errors: [`Critical error: ${error}`],
    };
  }
}

/**
 * Search vector store for relevant documents
 */
export async function searchKnowledgeBase(
  assistantId: string,
  tenantId: string,
  query: string,
  limit: number = DEFAULT_TOP_K
): Promise<AssistantMessageSource[]> {
  try {
    const vectorStore = await getVectorStore(assistantId, tenantId);

    // Perform similarity search with scores
    const results = await vectorStore.similaritySearchWithScore(query, limit);

    // Format results as AssistantMessageSource
    return results.map(([doc, score]) => {
      // Extract excerpt (first N characters or around query match)
      const content = doc.pageContent;
      let excerpt = content.substring(0, EXCERPT_LENGTH);
      if (content.length > EXCERPT_LENGTH) {
        excerpt += '...';
      }

      return {
        name: doc.metadata.sourceName || doc.metadata.source || 'Unknown',
        url: doc.metadata.source,
        excerpt,
        score: 1 - score, // Convert distance to similarity score
      };
    });
  } catch (error) {
    console.error('Failed to search knowledge base:', error);
    return [];
  }
}

/**
 * Delete vector store for an assistant
 */
export async function deleteVectorStore(
  assistantId: string,
  tenantId: string
): Promise<void> {
  try {
    // Clear cache
    clearCache(assistantId, tenantId);

    // Delete index
    const client = await createOpenSearchClient(tenantId);
    const indexName = getIndexName(assistantId, tenantId);

    try {
      await client.indices.delete({ index: indexName });
      console.log(`Deleted index: ${indexName}`);
    } catch (error: any) {
      // Ignore if index doesn't exist
      if (error.meta?.statusCode !== 404) {
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to delete vector store:', error);
    throw error;
  }
}

/**
 * Check sync status of knowledge base
 */
export async function getSyncStatus(
  assistantId: string,
  tenantId: string
): Promise<{
  status: AssistantSyncStatus;
  reason?: string;
  lastSyncDate?: string;
}> {
  try {
    const client = await createOpenSearchClient(tenantId);
    const indexName = getIndexName(assistantId, tenantId);

    // Check if index exists
    const exists = await client.indices.exists({ index: indexName });

    if (!exists.body) {
      return {
        status: 'FAILED',
        reason: 'Index does not exist',
      };
    }

    // Get index stats
    const stats = await client.indices.stats({ index: indexName });
    const docCount = stats.body._all?.primaries?.docs?.count || 0;

    if (docCount === 0) {
      return {
        status: 'FAILED',
        reason: 'No documents indexed',
      };
    }

    return {
      status: 'SYNCED',
      lastSyncDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return {
      status: 'FAILED',
      reason: `Error checking status: ${error}`,
    };
  }
}
