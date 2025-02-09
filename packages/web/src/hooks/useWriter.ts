import { StreamingChunk, UnrecordedMessage } from 'generative-ai-use-cases-jp';
import useChatApi from './useChatApi';
import { create } from 'zustand';
import { MODELS } from './useModel';

const useWriterState = create<{
  modelId: string;
  setModelId: (modelId: string) => void;
}>((set) => ({
  modelId: MODELS.textModels[0].modelId,
  setModelId: (modelId: string) => set({ modelId }),
}));

export const useWriter = () => {
  const { predictStream } = useChatApi();
  const { modelId, setModelId } = useWriterState();
  const generateMessages = (
    prompt: string,
    option: string,
    command?: string
  ): UnrecordedMessage[] => {
    prompt = prompt.replace(/<mark[^>]*>/g, '').replace(/<\/mark>/g, '');
    const options: Record<string, { messages: UnrecordedMessage[] }> = {
      continue: {
        messages: [
          {
            role: 'system',
            content:
              'You are an AI writing assistant that continues existing text based on context from prior text. ' +
              'Give more weight/priority to the later characters than the beginning ones. ' +
              'Limit your response to no more than 200 characters, but make sure to construct complete sentences.' +
              'Use Markdown formatting when appropriate.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      improve: {
        messages: [
          {
            role: 'system',
            content:
              'You are an AI writing assistant that improves existing text. ' +
              'Limit your response to no more than 200 characters, but make sure to construct complete sentences.' +
              'Use Markdown formatting when appropriate.',
          },
          {
            role: 'user',
            content: `<input>${prompt}</input>`,
          },
          {
            role: 'assistant',
            content: '<output>',
          },
        ],
      },
      shorter: {
        messages: [
          {
            role: 'system',
            content:
              'You are an AI writing assistant that shortens existing text. ' +
              'Use Markdown formatting when appropriate.',
          },
          {
            role: 'user',
            content: `<input>${prompt}</input>`,
          },
          {
            role: 'assistant',
            content: '<output>',
          },
        ],
      },
      longer: {
        messages: [
          {
            role: 'system',
            content:
              'You are an AI writing assistant that lengthens existing text. ' +
              'Use Markdown formatting when appropriate.',
          },
          {
            role: 'user',
            content: `<input>${prompt}</input>`,
          },
          {
            role: 'assistant',
            content: '<output>',
          },
        ],
      },
      fix: {
        messages: [
          {
            role: 'system',
            content:
              'You are an AI writing assistant that fixes grammar and spelling errors in existing text. ' +
              'Limit your response to no more than 200 characters, but make sure to construct complete sentences.' +
              'Use Markdown formatting when appropriate.',
          },
          {
            role: 'user',
            content: `<input>${prompt}</input>`,
          },
          {
            role: 'assistant',
            content: '<output>',
          },
        ],
      },
      zap: {
        messages: [
          {
            role: 'system',
            content:
              'You area an AI writing assistant that generates text based on a prompt. ' +
              'You take an input from the user and a command for manipulating the text' +
              'Use Markdown formatting when appropriate.',
          },
          {
            role: 'user',
            content: `<input>${prompt}</input><command>${command}</command>`,
          },
          {
            role: 'assistant',
            content: '<output>',
          },
        ],
      },
      comment: {
        messages: [
          {
            role: 'system',
            content:
              '以下は文章を校正したいユーザーと、ユーザーの意図と文章を理解して、適切に修正すべき箇所を指摘する校正 AI のやりとりです。' +
              'ユーザーは <input> タグで校正してほしい文章を与えます。' +
              'また、<その他指摘してほしいこと> タグで指摘時に追加で指摘したい箇所を与えます。' +
              'AI は文章について問題がある部分だけを指摘してください。' +
              'ただし、出力は <output-format></output-format> 形式の JSON Array だけを <output></output> タグで囲って出力してください。<output-format>[{excerpt: string; replace?: string; comment?: string}]</output-format>指摘事項がない場合は空配列を出力してください。',
          },
          {
            role: 'user',
            content: `<input>${prompt}</input>`,
          },
        ],
      },
    };

    return options[option as keyof typeof options]?.messages || [];
  };

  const write = async function* (
    prompt: string,
    option: string,
    command?: string
  ) {
    const messages = generateMessages(prompt, option, command);

    const stream = await predictStream({
      id: '1',
      messages,
      model: {
        type: 'bedrock',
        modelId: modelId,
      },
    });
    let tmpChunk = '';
    for await (const chunk of stream) {
      const chunks = chunk.split('\n');

      for (const c of chunks) {
        if (c && c.length > 0) {
          const payload = JSON.parse(c) as StreamingChunk;

          if (payload.text.length > 0) {
            tmpChunk += payload.text;
          }
        }

        if (tmpChunk.length >= 10) {
          yield tmpChunk;
          tmpChunk = '';
        }
      }

      if (tmpChunk.length > 0) {
        yield tmpChunk;
        tmpChunk = '';
      }
    }
  };

  return {
    write,
    modelId,
    setModelId,
  };
};

export default useWriter;
