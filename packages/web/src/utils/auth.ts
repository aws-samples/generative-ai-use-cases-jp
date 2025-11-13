import { signOut } from 'aws-amplify/auth';

/**
 * Centralized logout utility for handling user authentication termination
 * Used when role changes, permissions are revoked, or authentication errors occur
 */
export const performLogoutAndReload = async (
  reason?: string
): Promise<void> => {
  if (reason) {
    console.warn(`[auth] Performing logout due to: ${reason}`);
  }

  try {
    await signOut();
  } catch (signOutError) {
    console.error('[auth] Failed to sign out:', signOutError);
  } finally {
    // Always reload to clear application state regardless of signOut success
    window.location.reload();
  }
};

/**
 * Checks if an error response indicates role mismatch or permission issues
 */
export const isRoleMismatchError = (error: any): boolean => {
  if (error?.response?.status === 409) {
    const responseData = error.response.data;
    return responseData?.roleChanged && responseData?.refreshRequired;
  }

  if (error?.response?.status === 403) {
    const errorMessage = error.response.data?.message || '';
    return (
      errorMessage.includes('admin') ||
      errorMessage.includes('privilege') ||
      errorMessage.includes('revoked')
    );
  }

  return false;
};

/**
 * Checks if an error response indicates an authorization failure
 * This includes IP restriction violations, general authorization denials, etc.
 * These errors should trigger automatic sign-out to maintain security
 *
 * IMPORTANT: Resource-level permission denials (e.g., accessing another user's assistant)
 * should use specific error codes like ASSISTANT_ACCESS_DENIED to avoid triggering sign-out
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isAuthorizationError = (error: any): boolean => {
  // 403 Forbidden - typically indicates authorization failure
  if (error?.response?.status === 403) {
    // Extract error data from response
    const responseData = error.response.data;
    const errorCode = responseData?.code || '';
    const errorMessage = (
      responseData?.message ||
      responseData?.error ||
      responseData?.details ||
      (typeof responseData === 'string' ? responseData : '')
    ).toLowerCase();

    // Skip resource-level permission denials that have specific error codes
    if (errorCode === 'ASSISTANT_ACCESS_DENIED') {
      return false;
    }

    // Generic authorization error from API Gateway when authorizer returns Deny
    // This includes IP restriction violations
    // Using case-insensitive matching for robustness
    if (
      errorMessage.includes('not authorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('user is not authorized to access this resource') ||
      errorMessage === '' // Sometimes API Gateway returns empty message
    ) {
      return true;
    }

    // Catch explicit IP-related messages with word boundaries to avoid false positives
    // (e.g., "shipping", "equip", "whip" should NOT trigger)
    if (
      /(^|\b)ip (restriction|address|not allowed|denied|blocked)(\b|$)/i.test(
        errorMessage
      )
    ) {
      return true;
    }
  }

  return false;
};
