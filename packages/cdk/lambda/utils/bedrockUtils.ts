import { UnrecordedMessage } from 'generative-ai-use-cases-jp';

const generatePrompt = (messages: UnrecordedMessage[]): string => {
  return (
    messages
      .map(
        (m) =>
          `${
            m.role === 'system' || m.role === 'user' ? 'Human:' : 'Assistant:'
          } ${m.content} ${
            m.role === 'system'
              ? ' Assistant: コンテキストを理解しました。'
              : ''
          }`
      )
      .join('\n') + 'Assistant: '
  );
};

export const getClaudeInvokeInput = (messages: UnrecordedMessage[]) => {
  return {
    modelId: 'anthropic.claude-v2',
    body: JSON.stringify({
      prompt: generatePrompt(messages),

      max_tokens_to_sample: 3000,
      temperature: 0.6,
      top_k: 300,
      top_p: 0.8,
    }),
    contentType: 'application/json',
  };
};
