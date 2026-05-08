/**
 * System context generator for Meeting Minutes real-time translation
 * Analyzes transcript history to generate context for improved translation accuracy
 */

import { MODELS } from '../../hooks/useModel';
import { Transcript, Model } from 'generative-ai-use-cases';

// Real-time segment interface (minimal subset needed for context generation)
interface RealtimeSegmentForContext {
  isPartial: boolean;
  transcripts: Transcript[];
  startTime: number;
}

// Language code mapping for context generation
const LANGUAGE_NAME_MAPPING: { [key: string]: string } = {
  'ja-JP': 'Japanese',
  'en-US': 'English',
  'en-GB': 'English',
  'zh-CN': 'Chinese',
  'zh-TW': 'Chinese',
  'ko-KR': 'Korean',
  'th-TH': 'Thai',
  'vi-VN': 'Vietnamese',
  // Language family fallbacks
  ja: 'Japanese',
  en: 'English',
  zh: 'Chinese',
  ko: 'Korean',
  th: 'Thai',
  vi: 'Vietnamese',
};

/**
 * Get language name from language code
 * @param languageCode - Language code (e.g., 'ja-JP')
 * @returns Language name (e.g., 'Japanese')
 */
export const getLanguageNameFromCode = (languageCode: string): string => {
  // Try exact match first
  if (LANGUAGE_NAME_MAPPING[languageCode]) {
    return LANGUAGE_NAME_MAPPING[languageCode];
  }

  // Try language family match (e.g., 'fr-FR' -> 'fr')
  const languageFamily = languageCode.split('-')[0];
  if (LANGUAGE_NAME_MAPPING[languageFamily]) {
    return LANGUAGE_NAME_MAPPING[languageFamily];
  }

  // Return the language code as-is if no mapping found
  // This allows Bedrock to handle unknown languages gracefully
  return languageCode;
};

/**
 * Extract transcript text from segments
 * @param segments - Array of realtime segments
 * @returns Concatenated transcript text
 */
export const extractTranscriptText = (
  segments: RealtimeSegmentForContext[]
): string => {
  return segments
    .filter((segment) => !segment.isPartial && segment.transcripts.length > 0)
    .sort((a, b) => a.startTime - b.startTime)
    .map((segment) =>
      segment.transcripts.map((transcript) => transcript.transcript).join(' ')
    )
    .join(' ')
    .trim();
};

/**
 * Check if context generation should proceed
 * @param isTranslationEnabled - Whether real-time translation is enabled
 * @param isRecording - Whether currently recording
 * @param segments - Array of segments
 * @returns True if context generation should proceed
 */
export const shouldGenerateContext = (
  isTranslationEnabled: boolean,
  isRecording: boolean,
  segments: RealtimeSegmentForContext[]
): boolean => {
  if (!isTranslationEnabled || !isRecording || segments.length === 0) {
    return false;
  }

  const transcriptText = extractTranscriptText(segments);
  return transcriptText.length >= 50; // Default minimum length
};

/**
 * Create system prompt for context generation
 * @param targetLanguageName - Target language name
 * @returns System prompt string
 */
export const createContextGenerationPrompt = (
  targetLanguageName: string
): string => {
  return `You are an AI assistant that analyzes meeting transcripts to generate context for translation improvement.
Based on the provided transcript, generate a brief context (2-3 sentences) about what kind of meeting this is, the main topics being discussed, and any technical terms or domain-specific language being used.
Focus on information that would help improve translation accuracy.
Respond in ${targetLanguageName}.`;
};

/**
 * Generate system context from transcript segments
 * @param segments - Array of realtime segments
 * @param targetLanguage - Target language code for context generation
 * @param predict - Prediction function from useChatApi
 * @returns Promise resolving to generated context or null if failed
 */
export const generateSystemContext = async (
  segments: RealtimeSegmentForContext[],
  targetLanguage: string,
  predict: (params: {
    model: Model;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    id: string;
  }) => Promise<string>
): Promise<string | null> => {
  try {
    // Extract and validate transcript text
    const transcriptText = extractTranscriptText(segments);
    if (transcriptText.length < 50) {
      // Default minimum length
      return null;
    }

    // Get first available model
    const { modelIds } = MODELS;
    const firstModelId = modelIds[0];

    if (!firstModelId) {
      console.error('No models available for system context generation');
      return null;
    }

    // Dynamically import and get model
    const { findModelByModelId } = await import('../../hooks/useModel');
    const model = findModelByModelId(firstModelId);

    if (!model) {
      console.error('Model not found:', firstModelId);
      return null;
    }

    // Prepare messages for context generation
    const targetLanguageName = getLanguageNameFromCode(targetLanguage);
    const systemPrompt = createContextGenerationPrompt(targetLanguageName);

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user' as const,
        content: `Please analyze this meeting transcript and provide context for translation improvement:\n\n${transcriptText}`,
      },
    ];

    // Generate context
    const result = await predict({
      model,
      messages,
      id: '/meeting-context',
    });

    return result.trim();
  } catch (error) {
    console.error('Failed to generate system context:', error);
    return null;
  }
};

/**
 * Create a context generation function with preset target language
 * @param targetLanguage - Target language code
 * @param predict - Prediction function
 * @returns Configured context generation function
 */
export const createContextGenerator = (
  targetLanguage: string,
  predict: (params: {
    model: Model;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    id: string;
  }) => Promise<string>
) => {
  return async (
    segments: RealtimeSegmentForContext[]
  ): Promise<string | null> => {
    return generateSystemContext(segments, targetLanguage, predict);
  };
};

/**
 * Get context from recent segments for translation
 * @param segments - Array of realtime segments
 * @param maxSegments - Maximum number of recent segments to include (default: 10)
 * @returns Recent segments context as string
 */
export const getRecentSegmentsContext = (
  segments: RealtimeSegmentForContext[],
  maxSegments: number = 10
): string => {
  const recentSegments = segments
    .filter((segment) => !segment.isPartial && segment.transcripts.length > 0)
    .sort((a, b) => a.startTime - b.startTime)
    .slice(-maxSegments); // Get last N segments

  return recentSegments
    .map((segment) =>
      segment.transcripts.map((transcript) => transcript.transcript).join(' ')
    )
    .join(' ')
    .trim();
};
