import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { sdkStreamMixin } from '@smithy/util-stream-node';
import { KnowledgeSource } from 'generative-ai-use-cases';
import * as https from 'https';
import * as http from 'http';
import * as dns from 'dns';
import { promisify } from 'util';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantId } from '../utils/tenantUtils';
import { createTenantS3Client } from '../utils/tenantS3Client';
import { getTenant } from '../tenantManager';
import {
  getTenantBucketNameByTenantId,
  isDefaultTenant,
  extractAccountIdFromRoleArn,
} from '../utils/tenantS3Utils';

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

// Environment variable for managed bucket
const MANAGED_BUCKET_NAME = process.env.ASSISTANT_FILES_BUCKET_NAME;

/**
 * Determine content type from file extension
 */
function getContentTypeFromKey(key: string): string | null {
  const ext = key.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    pdf: 'application/pdf',
    html: 'text/html',
    csv: 'text/csv',
  };
  return contentTypes[ext || ''] || null;
}

/**
 * Chunk documents into smaller pieces for better retrieval
 * @param documents Array of documents to chunk
 * @param chunkSize Size of each chunk in characters
 * @param chunkOverlap Overlap between chunks
 * @returns Array of chunked documents
 */
export async function chunkDocuments(
  documents: Document[],
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<Document[]> {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });

    const chunkedDocs = await splitter.splitDocuments(documents);

    console.log(
      `Chunked ${documents.length} documents into ${chunkedDocs.length} chunks`
    );
    return chunkedDocs;
  } catch (error) {
    console.error('Error chunking documents:', error);
    throw error;
  }
}

/**
 * Add metadata to documents
 * @param documents Array of documents
 * @param assistantId The assistant ID
 * @param userId The user ID
 * @returns Documents with added metadata
 */
export function addMetadata(
  documents: Document[],
  assistantId: string,
  userId: string
): Document[] {
  return documents.map(
    (doc) =>
      new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          assistantId,
          userId,
          indexedAt: new Date().toISOString(),
        },
      })
  );
}

/**
 * Load a document from the managed S3 bucket using storageKey
 * @param storageKey The S3 key in the managed bucket
 * @param sourceId The source ID for metadata
 * @param userId The user ID for ownership verification
 * @param event API Gateway event for tenant context
 * @returns Document with content and metadata
 */
async function loadDocumentFromFile(
  storageKey: string,
  sourceId: string,
  userId: string,
  event: APIGatewayProxyEvent
): Promise<Document> {
  try {
    // Ownership check: Verify the storageKey belongs to this user
    // Expected format: assistant-files/{userId}/{fileId}/{fileName}
    const expectedPrefix = `assistant-files/${userId}/`;
    if (!storageKey.startsWith(expectedPrefix)) {
      throw new Error(
        `Unauthorized: storageKey does not belong to user ${userId}`
      );
    }

    // Get tenant-aware S3 bucket and client
    const tenantId = getTenantId(event);
    const isDefault = isDefaultTenant(tenantId);

    let bucketName: string;
    let tenantS3Client: S3Client;

    if (isDefault) {
      if (!MANAGED_BUCKET_NAME) {
        throw new Error(
          'ASSISTANT_FILES_BUCKET_NAME environment variable not set for default tenant'
        );
      }
      bucketName = MANAGED_BUCKET_NAME;
      tenantS3Client = new S3Client({});
    } else {
      const tenant = await getTenant(tenantId);

      if (!tenant || !tenant.roleArn || !tenant.region || !tenant.environment) {
        throw new Error('Tenant configuration incomplete');
      }

      const tenantAccountId = extractAccountIdFromRoleArn(tenant.roleArn);
      if (!tenantAccountId) {
        throw new Error(
          `Cannot extract account ID from role ARN: ${tenant.roleArn}`
        );
      }

      const tenantRegion = tenant.region;
      const tenantEnvironment = tenant.environment;

      bucketName = await getTenantBucketNameByTenantId(
        tenantId,
        'docs',
        MANAGED_BUCKET_NAME || '',
        tenantAccountId,
        tenantRegion,
        tenantEnvironment
      );

      tenantS3Client = await createTenantS3Client(event);
    }

    // Verify the object exists and get metadata
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    });

    const headResponse = await tenantS3Client.send(headCommand);

    // Verify userId in metadata matches (if stored)
    // Note: S3 lowercases metadata keys (userId -> userid)
    if (
      headResponse.Metadata?.userid &&
      headResponse.Metadata.userid !== userId
    ) {
      throw new Error(
        `Unauthorized: file metadata userId does not match ${userId}`
      );
    }

    // Now fetch the actual content
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    });

    const response = await tenantS3Client.send(command);

    if (!response.Body) {
      throw new Error(`No body in response for ${storageKey}`);
    }

    // Convert stream to buffer
    const sdkStream = sdkStreamMixin(response.Body);
    const data = await sdkStream.transformToByteArray();

    // Determine content type from metadata or key extension
    const contentType =
      response.ContentType || getContentTypeFromKey(storageKey) || 'text/plain';

    // Extract text content based on content type
    let content: string;

    if (contentType === 'application/pdf') {
      // Use PDFLoader for binary PDF parsing
      const blob = new Blob([Buffer.from(data)], { type: 'application/pdf' });
      const loader = new PDFLoader(blob, {
        splitPages: false, // We handle chunking separately with RecursiveCharacterTextSplitter
        parsedItemSeparator: '\n\n',
      });
      const docs = await loader.load();
      content = docs.map((doc) => doc.pageContent).join('\n\n');
    } else {
      // Use UTF-8 string conversion for text files
      content = Buffer.from(data).toString('utf-8');
    }

    return new Document({
      pageContent: content,
      metadata: {
        sourceId,
        sourceType: 'file',
        storageKey,
        bucket: bucketName,
        contentType,
        lastModified: response.LastModified?.toISOString(),
        size: response.ContentLength,
      },
    });
  } catch (error) {
    console.error(`Error loading document from file ${storageKey}:`, error);
    throw error;
  }
}

/**
 * Check if an IP address (IPv4 or IPv6) is in a blocked range
 */
function isBlockedIP(ip: string): boolean {
  // Check if IPv6
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();

    // Loopback: ::1
    if (lower === '::1' || lower === '::ffff:127.0.0.1') return true;

    // Link-local: fe80::/10
    if (lower.startsWith('fe80:')) return true;

    // Unique local: fc00::/7 and fd00::/8
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

    // IPv4-mapped IPv6 addresses (::ffff:0:0/96)
    if (lower.startsWith('::ffff:')) {
      // Extract the IPv4 part and check it
      const ipv4Match = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
      if (ipv4Match) {
        return isBlockedIP(ipv4Match[1]);
      }
    }

    return false; // Allow other IPv6 addresses
  }

  // IPv4 validation
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
    return true; // Invalid IP format
  }

  // Loopback: 127.0.0.0/8
  if (octets[0] === 127) return true;

  // Link-local: 169.254.0.0/16 (AWS metadata service!)
  if (octets[0] === 169 && octets[1] === 254) return true;

  // Private: 10.0.0.0/8
  if (octets[0] === 10) return true;

  // Private: 172.16.0.0/12
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;

  // Private: 192.168.0.0/16
  if (octets[0] === 192 && octets[1] === 168) return true;

  // Broadcast: 255.255.255.255
  if (
    octets[0] === 255 &&
    octets[1] === 255 &&
    octets[2] === 255 &&
    octets[3] === 255
  )
    return true;

  // This network: 0.0.0.0/8
  if (octets[0] === 0) return true;

  return false;
}

/**
 * Validate and sanitize a web URL with DNS resolution
 * @param url The URL to validate
 * @returns Validation result with sanitized URL or error
 */
async function validateWebUrl(url: string): Promise<{
  valid: boolean;
  sanitized?: string;
  error?: string;
}> {
  console.log(`Validating web URL: ${url}`);
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      console.error(`Unsupported protocol: ${parsed.protocol}`);
      return {
        valid: false,
        error: `Unsupported protocol: ${parsed.protocol}. Only http and https are allowed.`,
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and local hostnames
    if (
      hostname === 'localhost' ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0'
    ) {
      console.error(`Blocked localhost address: ${hostname}`);
      return {
        valid: false,
        error: 'Localhost addresses are not allowed.',
      };
    }

    // Block internal domain names
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      console.error(`Blocked internal domain: ${hostname}`);
      return {
        valid: false,
        error: 'Internal domain names are not allowed.',
      };
    }

    // Resolve hostname to IPv4 and IPv6 addresses and check them
    try {
      const ipv4Addresses = await dnsResolve4(hostname).catch(
        () => [] as string[]
      );
      const ipv6Addresses = await dnsResolve6(hostname).catch(
        () => [] as string[]
      );
      const allAddresses = [...ipv4Addresses, ...ipv6Addresses];

      console.log(`Resolved ${hostname} to addresses:`, allAddresses);

      if (allAddresses.length === 0) {
        console.error(`No DNS records found for ${hostname}`);
        return {
          valid: false,
          error: `Unable to resolve hostname: ${hostname}. No DNS records found.`,
        };
      }

      for (const ip of allAddresses) {
        if (isBlockedIP(ip)) {
          console.error(`Blocked IP address: ${ip} for hostname ${hostname}`);
          return {
            valid: false,
            error: `Hostname resolves to blocked IP address: ${ip}. Private networks, link-local, and special-use addresses are not allowed.`,
          };
        }
      }
    } catch (dnsError) {
      console.error(`DNS lookup failed for ${hostname}:`, dnsError);
      return {
        valid: false,
        error: `Unable to resolve hostname: ${hostname}. DNS lookup failed.`,
      };
    }

    console.log(`URL validation successful: ${parsed.toString()}`);
    return {
      valid: true,
      sanitized: parsed.toString(),
    };
  } catch (error) {
    console.error(`Invalid URL format for ${url}:`, error);
    return {
      valid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Fetch content from a web URL with size and type validation
 * @param url The URL to fetch
 * @param maxSizeBytes Maximum content size in bytes (default 5MB)
 * @returns Content as string
 */
async function fetchWebContent(
  url: string,
  maxSizeBytes: number = 5 * 1024 * 1024
): Promise<{ content: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;

    const request = client.get(url, (response) => {
      // Verify the actual connected socket address (prevent DNS rebinding)
      const remoteAddress = response.socket.remoteAddress;
      if (remoteAddress && isBlockedIP(remoteAddress)) {
        request.destroy();
        reject(
          new Error(
            `Connection blocked: remote address ${remoteAddress} is not allowed`
          )
        );
        return;
      }

      // Check status code
      if (
        response.statusCode &&
        (response.statusCode < 200 || response.statusCode >= 300)
      ) {
        reject(
          new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`)
        );
        return;
      }

      // Check content type
      const contentType =
        response.headers['content-type']?.split(';')[0].trim() || 'text/plain';
      const allowedTypes = [
        'text/plain',
        'text/html',
        'text/markdown',
        'text/csv',
        'application/json',
        'application/pdf',
      ];

      if (!allowedTypes.some((type) => contentType.includes(type))) {
        reject(new Error(`Unsupported content type: ${contentType}`));
        return;
      }

      // Check content length if provided
      const contentLength = response.headers['content-length'];
      if (contentLength && parseInt(contentLength) > maxSizeBytes) {
        reject(
          new Error(
            `Content too large: ${contentLength} bytes (max ${maxSizeBytes})`
          )
        );
        return;
      }

      const chunks: Buffer[] = [];
      let totalSize = 0;

      response.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;

        if (totalSize > maxSizeBytes) {
          request.destroy();
          reject(new Error(`Content exceeds ${maxSizeBytes} bytes`));
          return;
        }

        chunks.push(chunk);
      });

      response.on('end', () => {
        const content = Buffer.concat(chunks);
        resolve({ content, contentType });
      });

      response.on('error', (error) => {
        reject(error);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    // Set timeout
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout after 30 seconds'));
    });
  });
}

/**
 * Load a document from a web URL
 * @param sourceUrl The web URL to fetch
 * @param sourceId The source ID for metadata
 * @returns Document with content and metadata
 */
async function loadDocumentFromWeb(
  sourceUrl: string,
  sourceId: string
): Promise<Document> {
  try {
    // Validate URL
    const validation = await validateWebUrl(sourceUrl);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const sanitizedUrl = validation.sanitized!;

    // Fetch content
    const { content, contentType } = await fetchWebContent(sanitizedUrl);

    // Extract text content based on content type
    let processedContent: string;

    if (contentType === 'application/pdf') {
      // Use PDFLoader for binary PDF parsing
      const blob = new Blob([Buffer.from(content)], {
        type: 'application/pdf',
      });
      const loader = new PDFLoader(blob, {
        splitPages: false, // We handle chunking separately
        parsedItemSeparator: '\n\n',
      });
      const docs = await loader.load();
      processedContent = docs.map((doc) => doc.pageContent).join('\n\n');
    } else {
      // Convert buffer to string for text content
      let textContent = content.toString('utf-8');

      // Strip HTML boilerplate if HTML
      if (contentType.includes('text/html')) {
        // Basic HTML stripping - remove scripts, styles, and extract text
        processedContent = textContent
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        processedContent = textContent;
      }
    }

    return new Document({
      pageContent: processedContent,
      metadata: {
        sourceId,
        sourceType: 'web',
        sourceUrl: sanitizedUrl,
        contentType,
        fetchedAt: new Date().toISOString(),
        size: processedContent.length,
      },
    });
  } catch (error) {
    console.error(`Error loading document from web ${sourceUrl}:`, error);
    throw error;
  }
}

/**
 * Load documents from multiple knowledge sources
 * @param sources Array of knowledge sources
 * @param userId User ID
 * @param event API Gateway event for tenant context
 * @returns Array of documents
 */
export async function loadDocuments(
  sources: KnowledgeSource[],
  userId: string,
  event: APIGatewayProxyEvent
): Promise<Document[]> {
  const loadPromises = sources.map(async (source) => {
    try {
      if (source.type === 'file' && source.storageKey) {
        return await loadDocumentFromFile(
          source.storageKey,
          source.id,
          userId,
          event
        );
      } else if (source.type === 'web' && source.sourceUrl) {
        return await loadDocumentFromWeb(source.sourceUrl, source.id);
      } else {
        throw new Error(
          `Invalid source configuration: type=${source.type}, storageKey=${source.storageKey}, sourceUrl=${source.sourceUrl}`
        );
      }
    } catch (error) {
      console.error(`Failed to load source ${source.id}:`, error);
      // Re-throw with source context
      throw new Error(
        `Failed to load ${source.type} source "${source.displayName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

  try {
    const documents = await Promise.all(loadPromises);
    console.log(
      `Successfully loaded ${documents.length} documents from knowledge sources`
    );
    return documents;
  } catch (error) {
    console.error('Error loading documents from knowledge sources:', error);
    throw error;
  }
}

// Export validation function for use in handlers
export { validateWebUrl };
