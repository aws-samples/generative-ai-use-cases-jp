/**
 * AWS ARN utilities for parsing and extracting information
 */

export interface ParsedArn {
  partition: string;
  service: string;
  region: string;
  accountId: string;
  resource: string;
}

/**
 * Parse AWS ARN and extract components
 * ARN format: arn:partition:service:region:account-id:resource
 *
 * @param arn - AWS ARN string
 * @returns Parsed ARN components or null if invalid
 */
export const parseArn = (arn: string): ParsedArn | null => {
  if (!arn || typeof arn !== 'string') {
    return null;
  }

  const arnParts = arn.split(':');

  // ARN must have at least 6 parts: arn:partition:service:region:account-id:resource
  if (arnParts.length < 6 || arnParts[0] !== 'arn') {
    return null;
  }

  return {
    partition: arnParts[1],
    service: arnParts[2],
    region: arnParts[3],
    accountId: arnParts[4],
    resource: arnParts.slice(5).join(':'), // Resource can contain colons
  };
};

/**
 * Extract region from AWS ARN
 *
 * @param arn - AWS ARN string
 * @returns Region string or null if invalid ARN
 */
export const getRegionFromArn = (arn: string): string | null => {
  const parsed = parseArn(arn);
  return parsed?.region || null;
};

/**
 * Extract service from AWS ARN
 *
 * @param arn - AWS ARN string
 * @returns Service string or null if invalid ARN
 */
export const getServiceFromArn = (arn: string): string | null => {
  const parsed = parseArn(arn);
  return parsed?.service || null;
};

/**
 * Validate if ARN is for a specific AWS service
 *
 * @param arn - AWS ARN string
 * @param service - Expected service name
 * @returns True if ARN is for the specified service
 */
export const isArnForService = (arn: string, service: string): boolean => {
  const parsed = parseArn(arn);
  return parsed?.service === service;
};

/**
 * Validate if ARN is for Bedrock Agent Core
 *
 * @param arn - AWS ARN string
 * @returns True if ARN is for Bedrock Agent Core
 */
export const isBedrockAgentCoreArn = (arn: string): boolean => {
  return isArnForService(arn, 'bedrock-agentcore');
};

/**
 * Get runtime ID from Bedrock Agent Core ARN
 *
 * @param arn - Bedrock Agent Core ARN
 * @returns Runtime ID or null if invalid
 */
export const getAgentCoreRuntimeIdFromArn = (arn: string): string | null => {
  if (!isBedrockAgentCoreArn(arn)) {
    return null;
  }

  const parsed = parseArn(arn);
  if (!parsed) {
    return null;
  }

  // Resource format: runtime/runtime-id
  const resourceParts = parsed.resource.split('/');
  if (resourceParts.length >= 2 && resourceParts[0] === 'runtime') {
    return resourceParts.slice(1).join('/'); // Runtime ID can contain slashes
  }

  return null;
};
