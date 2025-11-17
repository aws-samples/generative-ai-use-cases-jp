import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getTenant } from './tenantManager';
import { getUserTenantId } from './utils/tenantUtils';
import {
  badRequest400Response,
  internalServerError500Response,
  notFound404Response,
  ok200Response,
} from './utils/apiResponse';

/**
 * This endpoint provides tenant-specific use case configuration for the frontend.
 * It only returns configuration stored in the tenant's database record.
 * Unlike the admin endpoint, this doesn't require admin privileges - any authenticated user can access their tenant's configuration.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(
    `[getTenantAwareUseCaseConfig] Called with event: ${JSON.stringify(event)}`
  );

  try {
    // Extract tenant ID from user claims
    const tenantId = getUserTenantId(event);
    if (!tenantId) {
      console.log('[getTenantAwareUseCaseConfig] No tenant ID found');
      return badRequest400Response({
        message: 'No tenant ID found in user claims',
      });
    }

    console.log(
      `[getTenantAwareUseCaseConfig] Getting configuration for tenant: ${tenantId}`
    );

    // Get tenant-specific use case configuration from database
    const tenant = await getTenant(tenantId);

    if (!tenant) {
      console.log(`[getTenantAwareUseCaseConfig] Tenant ${tenantId} not found`);
      return notFound404Response({ message: 'Tenant not found' });
    }

    const response = {
      tenantId,
      hiddenUseCases: tenant.useCaseConfiguration?.hiddenUseCases || {},
      source: 'tenant',
    };

    return ok200Response(response);
  } catch (error) {
    console.error('[getTenantAwareUseCaseConfig] Error:', error);
    return internalServerError500Response({
      message: 'Failed to get tenant use case configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
