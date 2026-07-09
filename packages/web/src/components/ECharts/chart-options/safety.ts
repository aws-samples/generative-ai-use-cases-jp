/** Keys that enable prototype pollution — blocked in both sanitize and merge. */
export const PROTO_UNSAFE_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

/** Maximum recursion depth for sanitizeOptions input validation. */
export const MAX_TREE_DEPTH = 10;

/** Maximum recursion depth for enforceTooltipSafetyDeep traversal.
 * Higher than MAX_TREE_DEPTH to cover deepMerge-added levels (2-3 extra). */
export const MAX_TOOLTIP_ENFORCEMENT_DEPTH = 20;

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
