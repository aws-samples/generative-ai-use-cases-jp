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
              '既存の文章の文脈に基づいて文章の続きを書いてください。' +
              '文章の後半部分により重点を置いて優先してください。' +
              '返答は200文字以内に制限し、必ず完全な文で終わるようにしてください。' +
              '適切な場合はMarkdown形式を使用してください。',
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
              '与えられた文章を推敲し改善してください。' +
              '「簡潔、論理的、わかりやすい、データによる裏付け（データがない場合はプレースホルダ X を入れる）」を意識してください。' +
              '返答は200文字以内に制限し、必ず完全な文で終わるようにしてください。' +
              '適切な場合はMarkdown形式を使用してください。',
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
              '与えられた文章をより短く簡潔にしてください。' +
              '適切な場合はMarkdown形式を使用してください。',
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
              '与えられた文章をより長く詳細にしてください。' +
              '適切な場合はMarkdown形式を使用してください。',
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
              '与えられた文章の文法や用語の間違いを修正してください' +
              '返答は200文字以内に制限し、必ず完全な文で終わるようにしてください。' +
              '適切な場合はMarkdown形式を使用してください。',
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
              'ユーザーから与えられた文章と command に従って、文章を生成してください。' +
              '適切な場合はMarkdown形式を使用してください。',
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
              'また、<その他指摘してほしいこと> タグで指摘時に追加で指摘してほしい箇所を与えます。' +
              'ただし、出力は <output-format></output-format> 形式の JSON Array だけを <output></output> タグで囲って出力してください。' +
              '<output-format>[{excerpt: string; replace?: string; comment?: string }]</output-format>' +
              '問題がある部分のみ指摘してください。Important! Only output sentence with error.' +
              '指摘事項がない場合は空配列を出力してください。',
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
