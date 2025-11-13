import { isIP } from 'net';

/**
 * Validates a single IP address range in CIDR notation.
 * Supports both IPv4 and IPv6 addresses.
 *
 * @param range - IP range in CIDR notation (e.g., "192.0.2.0/24" or "2001:db8::/32")
 * @returns true if the range is valid, false otherwise
 */
export function validateIpRange(range: string): boolean {
  if (!range || typeof range !== 'string') {
    return false;
  }

  // Split into IP and prefix
  const parts = range.split('/');
  if (parts.length !== 2) {
    return false;
  }

  const [ip, prefixStr] = parts;
  const prefix = parseInt(prefixStr, 10);

  // Check if prefix is a valid number
  if (isNaN(prefix)) {
    return false;
  }

  // Validate IP address
  const ipVersion = isIP(ip);
  if (ipVersion === 0) {
    return false; // Invalid IP
  }

  // Validate prefix length based on IP version
  if (ipVersion === 4) {
    // IPv4: prefix must be 0-32
    return prefix >= 0 && prefix <= 32;
  } else if (ipVersion === 6) {
    // IPv6: prefix must be 0-128
    return prefix >= 0 && prefix <= 128;
  }

  return false;
}

/**
 * Validates an array of IP address ranges.
 * Returns detailed validation results including any errors.
 *
 * @param ranges - Array of IP ranges in CIDR notation
 * @returns Object containing validation status and any errors
 */
export function validateIpRanges(ranges: string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(ranges)) {
    errors.push('IP ranges must be an array');
    return { valid: false, errors };
  }

  ranges.forEach((range, index) => {
    if (!validateIpRange(range)) {
      errors.push(`Invalid IP range at index ${index}: "${range}"`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates IP access control configuration.
 * Ensures that if enabled is true, at least one IP range is provided.
 *
 * @param config - IP access control configuration
 * @returns Object containing validation status and any errors
 */
export function validateIpAccessControl(config: {
  enabled: boolean;
  allowedIpV4AddressRanges: string[];
  allowedIpV6AddressRanges: string[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // If enabled is true, require at least one IP range
  if (config.enabled) {
    const hasIpV4 =
      config.allowedIpV4AddressRanges &&
      config.allowedIpV4AddressRanges.length > 0;
    const hasIpV6 =
      config.allowedIpV6AddressRanges &&
      config.allowedIpV6AddressRanges.length > 0;

    if (!hasIpV4 && !hasIpV6) {
      errors.push(
        'When ipAccessControl.enabled is true, at least one IP range must be provided in allowedIpV4AddressRanges or allowedIpV6AddressRanges'
      );
      return { valid: false, errors };
    }
  }

  // Validate IPv4 ranges
  if (
    config.allowedIpV4AddressRanges &&
    config.allowedIpV4AddressRanges.length > 0
  ) {
    const ipv4Validation = validateIpRanges(config.allowedIpV4AddressRanges);
    if (!ipv4Validation.valid) {
      errors.push(`Invalid IPv4 ranges: ${ipv4Validation.errors.join(', ')}`);
    }
  }

  // Validate IPv6 ranges
  if (
    config.allowedIpV6AddressRanges &&
    config.allowedIpV6AddressRanges.length > 0
  ) {
    const ipv6Validation = validateIpRanges(config.allowedIpV6AddressRanges);
    if (!ipv6Validation.valid) {
      errors.push(`Invalid IPv6 ranges: ${ipv6Validation.errors.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
