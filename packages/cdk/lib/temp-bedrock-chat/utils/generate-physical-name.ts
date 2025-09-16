/**
 * Reference: https://github.com/awslabs/generative-ai-cdk-constructs/blob/main/src/common/helpers/utils.ts
 */
import { IConstruct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { createHash } from "crypto";

export interface GeneratePhysicalNameOptions
  extends cdk.UniqueResourceNameOptions {
  /**
   * Whether to convert the name to lower case.
   *
   * @default false
   */
  lower?: boolean;

  /**
   * This object is hashed for uniqueness and can force a destroy instead of a replace.
   * @default: undefined
   */
  destroyCreate?: any;

  /**
   * Whether to suppress truncation warnings.
   *
   * @default false
   */
  suppressWarnings?: boolean;

  /**
   * Minimum length to reserve for the unique part of the name.
   * Higher values ensure more uniqueness but may require more truncation of the prefix.
   *
   * @default 5
   */
  minUniqueNameLength?: number;
}

/**
 * Logs a warning message to the console
 */
function logWarning(message: string, suppressWarnings = false): void {
  if (!suppressWarnings) {
    console.warn(`\x1b[33mWARNING: ${message}\x1b[0m`);
  }
}

export function generatePhysicalName(
  /**
   * The CDK scope of the resource.
   */
  scope: IConstruct,
  /**
   * The prefix for the name.
   */
  prefix: string,
  /**
   * Options for generating the name.
   */
  options?: GeneratePhysicalNameOptions
): string {
  function objectToHash(obj: any): string {
    // Nothing to hash if undefined
    if (obj === undefined) {
      return "";
    }

    // Convert the object to a JSON string
    const jsonString = JSON.stringify(obj);

    // Create a SHA-256 hash
    const hash = createHash("sha256");

    // Update the hash with the JSON string and get the digest in hexadecimal format
    // Shorten it (modeled after seven characters like git commit hash shortening)
    return hash.update(jsonString).digest("hex").slice(0, 7).toUpperCase();
  }

  const {
    maxLength = 256,
    lower = false,
    separator = "",
    destroyCreate = undefined,
    suppressWarnings = false,
    minUniqueNameLength = 5,
  } = options ?? {};

  const hash = objectToHash(destroyCreate);

  // Handle case where prefix is too long
  let truncatedPrefix = prefix;
  const minHashLength = hash.length;
  const minSeparatorLength = separator.length;
  // Use the configurable minUniqueNameLength instead of hardcoded value
  const totalMinLength =
    minHashLength + minSeparatorLength + minUniqueNameLength;

  // Flag to track if any truncation occurred
  let truncationOccurred = false;

  if (truncatedPrefix.length + totalMinLength > maxLength) {
    const originalLength = truncatedPrefix.length;
    // Ensure we have at least enough space for the minimum requirements
    truncatedPrefix = truncatedPrefix.substring(
      0,
      Math.max(1, maxLength - totalMinLength)
    );
    logWarning(
      `Prefix '${prefix}' (${originalLength} chars) truncated to '${truncatedPrefix}' (${truncatedPrefix.length} chars) ` +
        `to fit within max length ${maxLength} while reserving ${minHashLength} chars for hash and ${minUniqueNameLength} chars for unique ID.`,
      suppressWarnings
    );
    truncationOccurred = true;
  }

  // First, get a unique name from CDK that includes stack information
  const cdkUniqueName = cdk.Names.uniqueId(scope);

  // Create a unique hash using CDK's unique name and the full prefix
  // This ensures different resources get different hashes even with similar prefixes
  const uniqueInput = `${cdkUniqueName}:${prefix}`;
  const uniqueHash = createHash("md5")
    .update(uniqueInput)
    .digest("hex")
    .slice(0, minUniqueNameLength)
    .toUpperCase();

  // Combine parts
  const name = `${truncatedPrefix}${hash}${separator}${uniqueHash}`;

  // Final safety check
  if (name.length > maxLength) {
    const originalName = name;
    // Further reduce prefix if needed
    const excessLength = name.length - maxLength;
    const finalPrefix = truncatedPrefix.substring(
      0,
      Math.max(1, truncatedPrefix.length - excessLength)
    );
    const finalName = `${finalPrefix}${hash}${separator}${uniqueHash}`;

    logWarning(
      `Generated name '${originalName}' (${originalName.length} chars) exceeds maximum length of ${maxLength}. ` +
        `Further adjusted to '${finalName}' (${finalName.length} chars).`,
      suppressWarnings
    );

    // If we had to do additional truncation, log the final name
    if (truncationOccurred) {
      logWarning(`Final resource name: '${finalName}'`, suppressWarnings);
    }

    return lower ? finalName.toLowerCase() : finalName;
  }

  // Only log the final name if truncation occurred
  if (truncationOccurred) {
    logWarning(`Final resource name: '${name}'`, suppressWarnings);
  }

  return lower ? name.toLowerCase() : name;
}
