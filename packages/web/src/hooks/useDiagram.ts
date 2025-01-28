import { useMemo, useCallback, useState } from 'react';
import useChatApi from './useChatApi';
import { findModelByModelId } from './useModel';
import { getPrompter } from '../prompts';
import useChat from '../hooks/useChat';
import { PredictRequest } from 'generative-ai-use-cases-jp';

const DIAGRAM_TYPES = {
  flowchart: 'フローチャート',
  piechart: '円グラフ',
  mindmap: 'マインドマップ',
  quadrantchart: '4象限チャート',
  sequencediagram: 'シーケンス図',
  timeline: 'タイムライン図',
  gitgraph: 'Gitグラフ',
  erdiagram: 'ER図',
  classdiagram: 'クラス図',
  statediagram: '状態遷移図',
  xychart: 'XYチャート',
  blockdiagram: 'ブロック図',
  architecture: 'アーキテクチャ図',
  ganttchart: 'ガントチャート',
  userjourney: 'ユーザージャーニー図',
  sankeychart: 'サンキーチャート',
  requirementdiagram: '要件図',
  networkpacket: 'ネットワークパケット図',
} as const;

type DiagramType = keyof typeof DIAGRAM_TYPES;
const getDiagramTypeToJapanese = (): typeof DIAGRAM_TYPES => DIAGRAM_TYPES;

const useDiagram = (id: string) => {
  const {
    loading,
    getModelId,
    setModelId,
    setLoading,
    clear,
    updateSystemContext,
    messages,
    isEmpty,
    postChat,
  } = useChat(id);

  const modelId = useMemo(() => getModelId(), [getModelId]);
  const model = useMemo(() => {
    const mid = getModelId();
    return findModelByModelId(mid);
  }, [getModelId]);
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);
  const { predict } = useChatApi();

  const diagramTypeToJapanese = useMemo(getDiagramTypeToJapanese, []);
  const validTypes = useMemo(
    () => Object.keys(diagramTypeToJapanese) as DiagramType[],
    [diagramTypeToJapanese]
  );
  const [diagramType, setDiagramType] = useState<DiagramType | ''>('');

  // ダイアグラムタイプの抽出
  const extractDiagramType = useCallback(
    (targetText: string): DiagramType => {
      const defaultType = validTypes[0];
      const match = targetText.match(/<output>(.*?)<\/output>/i);
      if (!match) return defaultType;

      const content = match[1].toLowerCase();

      // 完全一致チェック
      if (validTypes.includes(content as DiagramType)) {
        return content as DiagramType;
      }

      // 部分一致チェック
      const matchingType = validTypes.find(
        (type) => content.includes(type) || type.includes(content)
      );
      return matchingType || defaultType;
    },
    [validTypes]
  );

  const selectDiagram = useCallback(
    async (content: string) => {
      try {
        if (!model) {
          throw new Error('Model not found');
        }

        const payload: PredictRequest = {
          model: model,
          messages: [
            {
              role: 'system',
              content: prompter.diagramPrompt({ determineType: true }),
            },
            {
              role: 'user',
              content: `<content>${content}</content>`,
            },
          ],
          id: id,
        };

        const res = await predict(payload);
        const type = extractDiagramType(res);
        setDiagramType(type);
        return type;
      } catch (error: unknown) {
        throw `${error}`;
      }
    },
    [id, model, predict, prompter, extractDiagramType]
  );

  const postDiagram = useCallback(
    async (content: string, type: DiagramType | 'AI') => {
      setDiagramType('');
      try {
        let chosenType = type;

        // 1. AIチョイス時はダイアグラムタイプを決定
        if (type === 'AI') {
          chosenType = await selectDiagram(content);
        } else {
          setDiagramType(type);
        }

        // 2. メッセージの過去の履歴をクリア
        clear();

        // 3. 決定したダイアグラムタイプのシステムプロンプトを設定
        const systemPrompt = prompter.diagramPrompt({
          determineType: false,
          diagramType: chosenType,
        });
        updateSystemContext(systemPrompt);

        // 4. ダイアグラム生成
        await postChat(content, true);
      } catch (error: unknown) {
        setLoading(false);
        throw `${error}`;
      }
    },
    [clear, prompter, updateSystemContext, postChat, selectDiagram, setLoading]
  );

  return {
    loading,
    getModelId,
    setModelId,
    setLoading,
    clear,
    messages,
    isEmpty,
    postDiagram,
    diagramType,
  };
};

export default useDiagram;
