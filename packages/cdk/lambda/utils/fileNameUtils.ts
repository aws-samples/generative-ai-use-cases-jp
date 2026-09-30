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
  // Bedrock only accepts ASCII alphanumeric, ASCII space (U+0020), hyphens, parentheses,
  // and square brackets — and prohibits consecutive spaces. Non-ASCII whitespace such as
  // U+3000 (IDEOGRAPHIC SPACE) is NOT accepted despite JavaScript's \s matching it.
  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9 \-()[\]]/g, '_')
    .replace(/ {2,}/g, ' ')
    .trim();

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
