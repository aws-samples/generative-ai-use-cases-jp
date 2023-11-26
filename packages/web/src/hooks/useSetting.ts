import useChatApi from './useChatApi';

const useSetting = () => {
  const { getSetting } = useChatApi();
  const { data } = getSetting();

  const modelRegion: string = data?.modelRegion || '';
  const models = data?.models || [];
  const imageGenModels = data?.imageGenModels || [];
  const hasSageMaker: boolean =
    models.filter((m) => m.type === 'sagemaker').length > 0;

  const modelDict = Object.fromEntries(models.map((m) => [m.modelName, m]));

  return {
    modelRegion: modelRegion,
    models: models,
    imageGenModels: imageGenModels,
    hasSageMaker: hasSageMaker,
    getModel: (modelName: string) => {
      return modelDict[modelName];
    },
    getAvailableModels: (supportedModels: string[]) => {
      return supportedModels.filter((m) => modelDict[m]);
    },
  };
};

export default useSetting;
