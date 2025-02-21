import {
  Model,
  StreamingChunk,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';
import useChatApi from './useChatApi';
import { create } from 'zustand';
import { MODELS } from './useModel';
import { v4 as uuidv4 } from 'uuid';

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
  ): { messages: UnrecordedMessage[]; overrideModel?: Model } => {
    prompt = prompt.replace(/<mark[^>]*>/g, '').replace(/<\/mark>/g, '');
    const options: Record<
      string,
      { messages: UnrecordedMessage[]; overrideModel?: Model }
    > = {
      continue: {
        messages: [
          {
            role: 'system',
            content:
              '既存の文章の文脈に基づいて文章の続きを書いてください。' +
              '文章の後半部分により重点を置いて優先してください。' +
              '返答は200文字以内に制限し、必ず完全な文で終わるようにしてください。' +
              '出力のみを <output> タグで囲んで出力してください。' +
              '適切な場合はMarkdown形式を使用してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
          {
            role: 'assistant',
            content: '<output>',
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
              '出力のみを <output> タグで囲んで出力してください。' +
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
              '出力のみを <output> タグで囲んで出力してください。' +
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
              '出力のみを <output> タグで囲んで出力してください。' +
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
              'あなたは校閲 AI です。与えられた文章の文法や用語の間違いを修正してください' +
              '返答は200文字以内に制限し、必ず完全な文で終わるようにしてください。' +
              '出力のみを <output> タグで囲んで出力してください。' +
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
              'ユーザーから与えられた文章と command に従って、文章を生成してください。出力のみを <output> タグで囲んで出力してください。' +
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
      search: {
        messages: [
          {
            role: 'user',
            content: `<input>${prompt}</input><command>${command}</command>`,
          },
        ],
        overrideModel: {
          type: 'bedrockAgent',
          modelId: MODELS.searchAgent || '',
          sessionId: uuidv4(),
        },
      },
      collectData: {
        messages: [
          {
            role: 'user',
            content: `以下はユーザーから与えられた文章です。根拠が薄い部分を列挙し検索して調査しデータや根拠を追記してください。<input>${prompt}</input>`,
          },
        ],
        overrideModel: {
          type: 'bedrockAgent',
          modelId: MODELS.searchAgent || '',
          sessionId: uuidv4(),
        },
      },
      factCheck: {
        messages: [
          {
            role: 'user',
            content: `以下はユーザーから与えられた文章です。述べられている事実を列挙し、それぞれファクトチェックを行ってください。<input>${prompt}</input>`,
          },
        ],
        overrideModel: {
          type: 'bedrockAgent',
          modelId: MODELS.searchAgent || '',
          sessionId: uuidv4(),
        },
      },
      comment: {
        messages: [
          {
            role: 'system',
            content:
              'あなたはユーザーの意図と文章を理解して、適切に修正すべき箇所を指摘する校正 AIです。\n' +
              'ユーザーは <input> タグで校正してほしい文章を与えます。 <指摘してほしいこと> を指摘してください。\n' +
              '修正案がある場合は修正案を replace で提案してください。\n' +
              '出力は以下の <output-format></output-format> 形式の JSON Array だけを <output></output> タグで囲って出力してください。\n' +
              '<output-format>[{"excerpt": string; "replace"?: string; "comment"?: string }]</output-format>\n' +
              '<指摘してほしいこと>\n' +
              '- 誤字脱字\n' +
              '- 文法の間違い\n' +
              '- 根拠が不足している箇所\n' +
              '- 論理性の不十分な箇所\n' +
              '- 考察が不十分な箇所\n' +
              '- 楽観的な表現の箇所\n' +
              '- 具体性に欠ける箇所\n' +
              '</指摘してほしいこと>\n' +
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

    return options[option as keyof typeof options];
  };

  const write = async function* (
    prompt: string,
    option: string,
    command?: string
  ): AsyncGenerator<{ text?: string; trace?: string }> {
    const { messages, overrideModel } = generateMessages(
      prompt,
      option,
      command
    );

    const stream = await predictStream({
      id: '1',
      messages,
      model: overrideModel || {
        type: 'bedrock',
        modelId: modelId,
      },
    });
    let tmpChunk = '';
    let tmpTrace = '';
    for await (const chunk of stream) {
      const chunks = chunk.split('\n');

      for (const c of chunks) {
        if (c && c.length > 0) {
          const payload = JSON.parse(c) as StreamingChunk;

          if (payload.text.length > 0) {
            tmpChunk += payload.text;
          }

          if (payload.trace) {
            tmpTrace += payload.trace;
          }
        }

        if (tmpChunk.length >= 10) {
          yield { text: tmpChunk };
          tmpChunk = '';
        }

        if (tmpTrace.length >= 10) {
          yield { trace: tmpTrace };
          tmpTrace = '';
        }
      }

      if (tmpChunk.length > 0) {
        yield { text: tmpChunk };
        tmpChunk = '';
      }

      if (tmpTrace.length > 0) {
        yield { trace: tmpTrace };
        tmpTrace = '';
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
