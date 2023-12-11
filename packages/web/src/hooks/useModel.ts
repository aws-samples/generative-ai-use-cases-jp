import { Model } from 'generative-ai-use-cases-jp';

const modelNames = import.meta.env.VITE_APP_MODEL_NAMES.split(',').filter(
  (name) => name
);
const endpointNames = import.meta.env.VITE_APP_ENDPOINT_NAMES.split(',').filter(
  (name) => name
);
const imageGenModelNames = import.meta.env.VITE_APP_IMAGE_MODEL_NAMES.split(
  ','
).filter((name) => name);
const textModels = [
  ...modelNames.map((name) => ({ modelName: name, type: 'bedrock' }) as Model),
  ...endpointNames.map(
    (name) => ({ modelName: name, type: 'sagemaker' }) as Model
  ),
];
const imageGenModels = [
  ...imageGenModelNames.map(
    (name) => ({ modelName: name, type: 'bedrock' }) as Model
  ),
];

const filterTextModels = (modelNames: string[]) => {
  return textModels.filter((model) => modelNames.includes(model.modelName));
};

const filterImageGenModels = (modelNames: string[]) => {
  return imageGenModels.filter((model) => modelNames.includes(model.modelName));
};

export const MODELS = {
  textModels: textModels,
  imageGenModels: imageGenModels,
  filterTextModels: filterTextModels,
  filterImageGenModels: filterImageGenModels,
};
