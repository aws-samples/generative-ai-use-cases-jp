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

// Configuration for context generation
interface ContextGenerationConfig {
  minTranscriptLength: number;
  targetLanguage: string;
}

// Language code mapping for context generation
const LANGUAGE_NAME_MAPPING: { [key: string]: string } = {
  'ja-JP': 'Japanese',
  'en-US': 'English',
  'zh-CN': 'Chinese',
  'ko-KR': 'Korean',
  'th-TH': 'Thai',
  'vi-VN': 'Vietnamese',
};

/**
 * Get language name from language code
 * @param languageCode - Language code (e.g., 'ja-JP')
 * @returns Language name (e.g., 'Japanese')
 */
export const getLanguageNameFromCode = (languageCode: string): string => {
  return LANGUAGE_NAME_MAPPING[languageCode] || 'Japanese';
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
 * @param config - Configuration object
 * @returns True if context generation should proceed
 */
export const shouldGenerateContext = (
  isTranslationEnabled: boolean,
  isRecording: boolean,
  segments: RealtimeSegmentForContext[],
  config: ContextGenerationConfig
): boolean => {
  if (!isTranslationEnabled || !isRecording || segments.length === 0) {
    return false;
  }

  const transcriptText = extractTranscriptText(segments);
  return transcriptText.length >= config.minTranscriptLength;
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
 * @param config - Configuration for context generation
 * @param predict - Prediction function from useChatApi
 * @returns Promise resolving to generated context or null if failed
 */
export const generateSystemContext = async (
  segments: RealtimeSegmentForContext[],
  config: ContextGenerationConfig,
  predict: (params: {
    model: Model;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    id: string;
  }) => Promise<string>
): Promise<string | null> => {
  try {
    // Extract and validate transcript text
    const transcriptText = extractTranscriptText(segments);
    if (transcriptText.length < config.minTranscriptLength) {
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
    const targetLanguageName = getLanguageNameFromCode(config.targetLanguage);
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
 * Create a context generation function with preset configuration
 * @param config - Configuration object
 * @param predict - Prediction function
 * @returns Configured context generation function
 */
export const createContextGenerator = (
  config: ContextGenerationConfig,
  predict: (params: {
    model: Model;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    id: string;
  }) => Promise<string>
) => {
  return async (
    segments: RealtimeSegmentForContext[]
  ): Promise<string | null> => {
    return generateSystemContext(segments, config, predict);
  };
};
