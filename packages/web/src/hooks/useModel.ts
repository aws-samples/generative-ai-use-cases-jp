import { Model } from 'generative-ai-use-cases-jp';

const modelRegion = import.meta.env.VITE_APP_MODEL_REGION;

const modelIds: string[] = JSON.parse(import.meta.env.VITE_APP_MODEL_IDS)
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
const textModels = [
  ...modelIds.map((name) => ({ modelId: name, type: 'bedrock' }) as Model),
  ...endpointNames.map(
    (name) => ({ modelId: name, type: 'sagemaker' }) as Model
  ),
];
const imageGenModels = [
  ...imageGenModelIds.map(
    (name) => ({ modelId: name, type: 'bedrock' }) as Model
  ),
];

export const MODELS = {
  modelRegion: modelRegion,
  modelIds: modelIds,
  imageGenModelIds: imageGenModelIds,
  textModels: textModels,
  imageGenModels: imageGenModels,
};
