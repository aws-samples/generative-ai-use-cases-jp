import { signOut } from 'aws-amplify/auth';

/**
 * Centralized logout utility for handling user authentication termination
 * Used when role changes, permissions are revoked, or authentication errors occur
 */
export const performLogoutAndReload = async (reason?: string): Promise<void> => {
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