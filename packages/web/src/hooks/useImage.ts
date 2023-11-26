import { GenerateImageParams } from 'generative-ai-use-cases-jp';
import useImageApi from './useImageApi';

const useImage = () => {
  const { generateImage } = useImageApi();

  return {
    generate: async (params: GenerateImageParams) => {
      return (
        await generateImage({
          // 現状は Stable Diffusion 固定
          model: {
            type: 'bedrock',
            modelName: 'stability.stable-diffusion-xl-v0',
          },
          params: {
            ...params,
            stylePreset:
              params.stylePreset === '' ? undefined : params.stylePreset,
            initImage:
              params.initImage === ''
                ? undefined
                : params.initImage?.split(',')[1],
          },
        })
      ).data;
    },
  };
};

export default useImage;
