import { StreamingChunk } from 'generative-ai-use-cases';

/**
 * Parses a streamed JSON chunk string into structured data.
 * Handles multiple JSON objects separated by newlines within a single chunk.
 *
 * @param chunk - The raw chunk string from the stream
 * @returns An array of parsed StreamingChunk objects
 */
export const parseStreamChunk = (chunk: string): StreamingChunk[] => {
  const results: StreamingChunk[] = [];
  const lines = chunk.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    try {
      const payload = JSON.parse(line) as StreamingChunk;
      results.push(payload);
    } catch {
      // Skip lines that can't be parsed as JSON
      console.warn('Failed to parse stream chunk line:', line);
    }
  }

  return results;
};

/**
 * Extracts text content from stream chunks.
 *
 * @param chunks - Array of StreamingChunk objects
 * @returns Concatenated text from all chunks
 */
export const extractTextFromChunks = (chunks: StreamingChunk[]): string => {
  return chunks
    .filter((chunk) => chunk.text && chunk.text.length > 0)
    .map((chunk) => chunk.text)
    .join('');
};
