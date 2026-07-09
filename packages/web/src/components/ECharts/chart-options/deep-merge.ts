import { PROTO_UNSAFE_KEYS, isPlainObject, MAX_TREE_DEPTH } from './safety';

/**
 * Recursively merges `source` into `target` up to `maxDepth` levels deep.
 *
 * **Broadcast behavior**: when a source value is a plain object and the
 * corresponding target value is an array, the source object is applied to
 * every element of the array. The `type` key is excluded from broadcast
 * merges to preserve builder-set series types (e.g. `'bar'`, `'line'`).
 * Primitive elements in the target array are preserved unchanged.
 *
 * **maxDepth**: at or beyond `maxDepth`, source values overwrite target
 * values without further recursion.
 *
 * @param target - Base object to merge into (not mutated).
 * @param source - Object whose values are merged on top of target.
 * @param maxDepth - Maximum recursion depth (default: MAX_TREE_DEPTH).
 * @returns A new merged object.
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  maxDepth = MAX_TREE_DEPTH
): Record<string, unknown> {
  return mergeInternal(target, source, maxDepth, 0);
}

function broadcastMerge(
  _key: string,
  target: unknown[],
  source: Record<string, unknown>,
  maxDepth: number,
  depth: number
): unknown[] {
  const safeSv = Object.fromEntries(
    Object.entries(source).filter(
      ([k]) => k !== 'type' && !PROTO_UNSAFE_KEYS.has(k)
    )
  );
  return target.map((item) =>
    isPlainObject(item)
      ? mergeInternal(
          item as Record<string, unknown>,
          safeSv,
          maxDepth,
          depth + 1
        )
      : item
  );
}

function mergeInternal(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  maxDepth: number,
  depth: number
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    if (PROTO_UNSAFE_KEYS.has(key)) continue;
    const sv = source[key];
    const tv = target[key];
    if (depth >= maxDepth) {
      result[key] = sv;
    } else if (Array.isArray(sv) && Array.isArray(tv)) {
      const merged = [...tv];
      for (let i = 0; i < sv.length; i++) {
        const si = sv[i] as unknown;
        const ti = tv[i] as unknown;
        if (isPlainObject(si) && isPlainObject(ti)) {
          merged[i] = mergeInternal(
            ti as Record<string, unknown>,
            si as Record<string, unknown>,
            maxDepth,
            depth + 1
          );
        } else {
          merged[i] = si;
        }
      }
      result[key] = merged;
    } else if (isPlainObject(sv) && isPlainObject(tv)) {
      result[key] = mergeInternal(
        tv as Record<string, unknown>,
        sv as Record<string, unknown>,
        maxDepth,
        depth + 1
      );
    } else if (isPlainObject(sv) && Array.isArray(tv)) {
      result[key] = broadcastMerge(
        key,
        tv,
        sv as Record<string, unknown>,
        maxDepth,
        depth
      );
    } else {
      result[key] = sv;
    }
  }
  return result;
}
