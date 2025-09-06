/**
 * Segment splitting utility for Meeting Minutes real-time translation
 * Supports language-specific sentence boundaries for improved translation accuracy
 */

// Supported language codes for segment-based translation
export type SupportedLanguageCode = 'ja-JP' | 'en-US';

// Language code type that includes unsupported languages
export type LanguageCode = SupportedLanguageCode | string;

// Sentence delimiters configuration for different languages
const SENTENCE_DELIMITERS: Record<SupportedLanguageCode, string[]> = {
  'ja-JP': ['。', '?'],
  'en-US': ['.', '?'],
  // Future languages can be added here:
  // 'zh-CN': ['。', '？'],
  // 'ko-KR': ['.', '?', '。'],
} as const;

/**
 * Check if a language supports segment-based translation
 * @param languageCode - Language code to check
 * @returns true if the language supports segment-based translation
 */
export const supportsSentenceTranslation = (
  languageCode?: string
): languageCode is SupportedLanguageCode => {
  return languageCode !== undefined && languageCode in SENTENCE_DELIMITERS;
};

/**
 * Get supported language codes
 * @returns Array of supported language codes
 */
export const getSupportedLanguageCodes = (): SupportedLanguageCode[] => {
  return Object.keys(SENTENCE_DELIMITERS) as SupportedLanguageCode[];
};

/**
 * Get sentence delimiters for a specific language
 * @param languageCode - Language code
 * @returns Array of sentence delimiters or null if not supported
 */
export const getSentenceDelimiters = (
  languageCode: string
): string[] | null => {
  if (!supportsSentenceTranslation(languageCode)) {
    return null;
  }
  return SENTENCE_DELIMITERS[languageCode];
};

/**
 * Split text into sentences based on language-specific delimiters
 * @param text - Text to split into sentences
 * @param languageCode - Language code for delimiter selection
 * @returns Array of sentences with delimiters preserved
 */
export const splitIntoSentences = (
  text: string,
  languageCode?: string
): string[] => {
  // Return as single segment for unsupported languages
  if (!supportsSentenceTranslation(languageCode)) {
    return text.trim() ? [text] : [];
  }

  // Get delimiters for the supported language
  const delimiters = SENTENCE_DELIMITERS[languageCode];

  // Create regex pattern that captures delimiters
  const escapedDelimiters = delimiters.map((delimiter) =>
    delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(`([${escapedDelimiters.join('')}])`, 'g');

  // Split text and reconstruct with delimiters
  const parts = text.split(pattern);
  const sentences: string[] = [];

  // Reconstruct sentences with their delimiters
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i] || '';
    const delimiter = parts[i + 1] || '';

    const combinedSentence = sentence + delimiter;
    if (combinedSentence.trim()) {
      sentences.push(combinedSentence);
    }
  }

  return sentences.filter((sentence) => sentence.trim().length > 0);
};

/**
 * Validate if text contains sentence delimiters for the given language
 * @param text - Text to validate
 * @param languageCode - Language code
 * @returns true if text contains sentence delimiters
 */
export const containsSentenceDelimiters = (
  text: string,
  languageCode?: string
): boolean => {
  if (!supportsSentenceTranslation(languageCode)) {
    return false;
  }

  const delimiters = SENTENCE_DELIMITERS[languageCode];
  return delimiters.some((delimiter) => text.includes(delimiter));
};

/**
 * Count sentences in text for the given language
 * @param text - Text to count sentences in
 * @param languageCode - Language code
 * @returns Number of sentences
 */
export const countSentences = (text: string, languageCode?: string): number => {
  const sentences = splitIntoSentences(text, languageCode);
  return sentences.length;
};
