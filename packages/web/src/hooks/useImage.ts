import { GenerateImageParams } from 'generative-ai-use-cases-jp';
import useImageApi from './useImageApi';

const useImage = () => {
  const { generateImage } = useImageApi();

  return {
    generate: async (params: GenerateImageParams) => {
      return (
        await generateImage({
          ...params,
          stylePreset:
            params.stylePreset === '' ? undefined : params.stylePreset,
        })
      ).data;
    },
  };
};

export default useImage;
