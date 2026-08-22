import crypto from 'crypto';

/**
 * Convert filename to safe format for AWS Bedrock API
 * AWS Bedrock DocumentBlock.name only allows: alphanumeric, single ASCII spaces,
 * hyphens, parentheses, square brackets, and requires at least one character
 * Replaces non-allowed characters with '_' and adds hash suffix only when replacements occur
 * @param filename Original filename
 * @returns Safe filename with hash suffix (only if non-allowed characters were replaced)
 */
export const convertToSafeFilename = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  const nameWithoutExt =
    lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;

  // \s cannot be used here: it also matches U+3000 (ideographic space) and tabs,
  // which Bedrock rejects. Only the ASCII space is allowed through.
  // Bedrock also rejects two or more consecutive whitespace characters.
  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9 \-()[\]]/g, '_')
    .replace(/ {2,}/g, ' ');

  // DocumentBlock.name requires a minimum length of 1
  const normalizedName = safeName === '' ? 'file' : safeName;

  // Add hash only if non-ASCII characters were replaced
  if (normalizedName !== nameWithoutExt) {
    const hash = crypto
      .createHash('md5')
      .update(filename)
      .digest('hex')
      .substring(0, 8);
    return `${normalizedName}_${hash}`;
  }

  return normalizedName;
};
