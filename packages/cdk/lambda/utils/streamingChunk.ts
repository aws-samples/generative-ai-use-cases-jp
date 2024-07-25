import { StreamingChunk } from 'generative-ai-use-cases-jp';

// JSONL 形式
export const streamingChunk = (chunk: StreamingChunk): string => {
  return JSON.stringify(chunk) + '\n';
};
