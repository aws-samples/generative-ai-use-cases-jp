import { Model } from 'generative-ai-use-cases-jp';

const modelRegion = import.meta.env.VITE_APP_MODEL_REGION;

// 環境変数からモデル名などを取得
const bedrockModelIds: string[] = JSON.parse(import.meta.env.VITE_APP_MODEL_IDS)
  .map((name: string) => name.trim())
  .filter((name: string) => name);

const multiModalModelIds: string[] = JSON.parse(
  import.meta.env.VITE_APP_MULTI_MODAL_MODEL_IDS
)
  .map((name: string) => name.trim())
  .filter((name: string) => name);

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
  return [...textModels, ...imageGenModels, ...agentModels].find(
    (m) => m.modelId === modelId
  );
};

export const MODELS = {
  modelRegion: modelRegion,
  modelIds: [...bedrockModelIds, ...endpointNames],
  multiModalModelIds: multiModalModelIds,
  imageGenModelIds: imageGenModelIds,
  agentNames: agentNames,
  textModels: textModels,
  imageGenModels: imageGenModels,
  agentModels: agentModels,
};
