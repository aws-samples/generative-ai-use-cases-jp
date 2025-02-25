import { Model } from 'generative-ai-use-cases-jp';
import { modelFeatureFlags } from '@generative-ai-use-cases-jp/common';

const modelRegion = import.meta.env.VITE_APP_MODEL_REGION;

// 環境変数からモデル名などを取得
const bedrockModelIds: string[] = JSON.parse(import.meta.env.VITE_APP_MODEL_IDS)
  .map((name: string) => name.trim())
  .filter((name: string) => name);
const visionModelIds: string[] = bedrockModelIds.filter(
  (modelId) => modelFeatureFlags[modelId].image
);
const visionEnabled: boolean = visionModelIds.length > 0;

const endpointNames: string[] = JSON.parse(
  import.meta.env.VITE_APP_ENDPOINT_NAMES
)
  .map((name: string) => name.trim())
  .filter((name: string) => name);

const imageGenModelIds: string[] = JSON.parse(
  import.meta.env.VITE_APP_IMAGE_MODEL_IDS
)
  .map((name: string) => name.trim())
  .filter((name: string) => name);

const agentNames: string[] = JSON.parse(import.meta.env.VITE_APP_AGENT_NAMES)
  .map((name: string) => name.trim())
  .filter((name: string) => name);

const getFlows = () => {
  try {
    return JSON.parse(import.meta.env.VITE_APP_FLOWS);
  } catch (e) {
    return [];
  }
};

const flows = getFlows();

// モデルオブジェクトの定義
const textModels = [
  ...bedrockModelIds.map(
    (name) => ({ modelId: name, type: 'bedrock' }) as Model
  ),
  ...endpointNames.map(
    (name) => ({ modelId: name, type: 'sagemaker' }) as Model
  ),
];
const imageGenModels = [
  ...imageGenModelIds.map(
    (name) => ({ modelId: name, type: 'bedrock' }) as Model
  ),
];
const agentModels = [
  ...agentNames.map(
    (name) => ({ modelId: name, type: 'bedrockAgent' }) as Model
  ),
];

export const findModelByModelId = (modelId: string) => {
  const model = [...textModels, ...imageGenModels, ...agentModels].find(
    (m) => m.modelId === modelId
  );

  if (model) {
    // deep copy
    return JSON.parse(JSON.stringify(model));
  }

  return undefined;
};

const searchAgent = agentNames.find((name) => name.includes('Search'));

export const MODELS = {
  modelRegion: modelRegion,
  modelIds: [...bedrockModelIds, ...endpointNames],
  modelFeatureFlags: modelFeatureFlags,
  visionModelIds: visionModelIds,
  visionEnabled: visionEnabled,
  imageGenModelIds: imageGenModelIds,
  agentNames: agentNames,
  textModels: textModels,
  imageGenModels: imageGenModels,
  agentModels: agentModels,
  agentEnabled: agentNames.length > 0,
  searchAgent: searchAgent,
  flows,
  flowChatEnabled: flows.length > 0,
};
