import { Model } from 'generative-ai-use-cases-jp';
import useChatApi from './useChatApi';

const useSetting = () => {
  const { getSetting } = useChatApi();
  const { data } = getSetting();

  const MODEL_REGION: string = data?.modelRegion || '';
  const MODELS = data?.models || [];
  const IMAGE_GEN_MODELS = data?.imageGenModels || [];

  const getSagemakerModels = (models: Model[]) => {
    return models.filter(m => m.type === 'sagemaker');
  }
  
  const createModelDictionary = (models: Model[]) => {
    return Object.fromEntries(models.map(m => [m.modelName, m]))
  }

  const hasSageMaker: boolean = getSagemakerModels(MODELS).length > 0;
  const modelDict = createModelDictionary(MODELS);

  const getModel = (modelName: string) => {
    return modelDict[modelName];
  }

  const filterAvailableModels = (supportedModels: string[]) => {
    return supportedModels.filter(m => modelDict[m]);
  }

  return {
    modelRegion: MODEL_REGION,
    models: MODELS,
    imageGenModels: IMAGE_GEN_MODELS,
    hasSageMaker: hasSageMaker,
    getModel: getModel,
    getAvailableModels: filterAvailableModels
  };
};

export default useSetting;
