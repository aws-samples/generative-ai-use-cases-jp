import { APIGatewayProxyEvent } from 'aws-lambda';
import { Assistant } from 'generative-ai-use-cases';
import { getTenantId } from './tenantUtils';

/**
 * Check if user can access an assistant
 * Returns true if: owner OR (public AND same tenant)
 *
 * @param assistant - The assistant to check access for
 * @param userId - The current user's ID (without 'user#' prefix)
 * @param event - The API Gateway event (used to extract tenant info)
 * @returns true if user can access the assistant, false otherwise
 */
export function canAccessAssistant(
  assistant: Assistant,
  userId: string,
  event: APIGatewayProxyEvent
): boolean {
  const userIdWithPrefix = `user#${userId}`;

  // Owner can always access
  if (assistant.userId === userIdWithPrefix) {
    return true;
  }

  // Non-owners can access if assistant is public and in same tenant
  const tenantId = getTenantId(event);
  const assistantTenantId = assistant.tenantId?.replace('tenant#', '');

  return assistant.visibility === 'public' && assistantTenantId === tenantId;
}
