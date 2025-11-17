import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyAdminAccess, isAdminContext } from './utils/adminAuth';
import { SelfSignUpTenantMapEntry } from 'generative-ai-use-cases';
import {
  badRequest400Response,
  internalServerError500Response,
  ok200Response,
} from './utils/apiResponse';

// Load tenant map for domain validation
const TENANT_MAP_STR = process.env.SELF_SIGNUP_TENANT_MAP || '[]';
const TENANT_MAP: SelfSignUpTenantMapEntry[] = JSON.parse(TENANT_MAP_STR);

export interface ValidateDomainsRequest {
  emails: string[];
}

export interface DomainValidationResult {
  email: string;
  hasUnconfiguredDomain: boolean;
}

export interface ValidateDomainsResponse {
  results: DomainValidationResult[];
  hasAnyUnconfiguredDomains: boolean;
  unconfiguredEmails: string[];
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check if email domain is configured in tenant map
function isDomainConfigured(email: string): boolean {
  if (email.split('@').length !== 2) {
    return false;
  }
  const lowerEmail = email.toLowerCase();
  const domain = lowerEmail.split('@')[1];

  for (const entry of TENANT_MAP) {
    if (entry.emails && entry.emails.includes(lowerEmail)) {
      return true;
    }
    if (entry.domains && entry.domains.includes(domain)) {
      return true;
    }
  }
  return false;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(event);
    if (!isAdminContext(adminResult)) {
      return adminResult;
    }

    // Parse request body
    let requestBody: ValidateDomainsRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return badRequest400Response({ message: 'Invalid JSON in request body' });
    }

    const { emails } = requestBody;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return badRequest400Response({
        message: 'emails array is required and must not be empty',
      });
    }

    // Validate all emails
    const invalidEmails = emails.filter((email) => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      return badRequest400Response({
        message: 'Invalid email addresses found',
        invalidEmails,
      });
    }

    // Check domain configuration for each email
    const results: DomainValidationResult[] = emails.map((email) => ({
      email,
      hasUnconfiguredDomain: !isDomainConfigured(email),
    }));

    const unconfiguredEmails = results
      .filter((result) => result.hasUnconfiguredDomain)
      .map((result) => result.email);

    const response: ValidateDomainsResponse = {
      results,
      hasAnyUnconfiguredDomains: unconfiguredEmails.length > 0,
      unconfiguredEmails,
    };

    console.log(
      `Domain validation results: ${unconfiguredEmails.length} unconfigured out of ${emails.length} total`
    );

    return ok200Response(response);
  } catch (error) {
    console.error('Error validating domains:', error);
    return internalServerError500Response({
      message: 'Failed to validate domains',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
