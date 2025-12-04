/**
 * Stream Parser Utility
 *
 * Parses JSON streaming responses from the predict API.
 * The stream returns JSON strings like {"text":"..."} or {"text":"","stopReason":"end_turn"}
 */

export interface StreamChunk {
  text?: string;
  stopReason?: string;
  metadata?: {
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
  };
}

/**
 * Parses a streamed JSON chunk string into structured data.
 * Handles multiple JSON objects separated by newlines within a single chunk.
 *
 * @param chunk - The raw chunk string from the stream
 * @returns An array of parsed StreamChunk objects
 */
export const parseStreamChunk = (chunk: string): StreamChunk[] => {
  const results: StreamChunk[] = [];
  const lines = chunk.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    try {
      const payload = JSON.parse(line) as StreamChunk;
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
 * @param chunks - Array of StreamChunk objects
 * @returns Concatenated text from all chunks
 */
export const extractTextFromChunks = (chunks: StreamChunk[]): string => {
  return chunks
    .filter((chunk) => chunk.text && chunk.text.length > 0)
    .map((chunk) => chunk.text)
    .join('');
};

/**
 * Async generator that yields text content from a predict stream.
 *
 * @param stream - The async iterable stream from predictStream
 * @yields Text content extracted from each chunk
 */
export async function* streamToText(
  stream: AsyncIterable<string | Uint8Array>
): AsyncGenerator<string, void, unknown> {
  for await (const chunk of stream) {
    const chunkStr =
      typeof chunk === 'string'
        ? chunk
        : new TextDecoder('utf-8').decode(chunk);
    const parsedChunks = parseStreamChunk(chunkStr);
    const text = extractTextFromChunks(parsedChunks);
    if (text) {
      yield text;
    }
  }
}
