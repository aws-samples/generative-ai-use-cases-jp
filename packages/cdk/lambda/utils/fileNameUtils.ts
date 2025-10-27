import crypto from 'crypto';

/**
 * Convert filename to safe format for AWS Bedrock API
 * AWS Bedrock DocumentBlock.name only allows: alphanumeric, whitespace, hyphens, parentheses, square brackets
 * Replaces non-allowed characters with '_' and adds hash suffix only when replacements occur
 * @param filename Original filename
 * @returns Safe filename with hash suffix (only if non-allowed characters were replaced)
 */
export const convertToSafeFilename = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  const nameWithoutExt =
    lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9\s\-()[\]]/g, '_');

  // Add hash only if non-ASCII characters were replaced
  if (safeName !== nameWithoutExt) {
    const hash = crypto
      .createHash('md5')
      .update(filename)
      .digest('hex')
      .substring(0, 8);
    return `${safeName}_${hash}`;
  }

  return safeName;
};
