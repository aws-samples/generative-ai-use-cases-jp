// 標準化したパラメータ
export type GenerateImageParams = {
  textPrompt: {
    text: string;
    weight: number;
  }[];
  cfgScale: number;
  seed: number;
  step: number;
  stylePreset?: string;
  initImage?: string;
  imageStrength?: number;
};

// Stable Diffusion
// パラメータは Stable Diffusion XL に合わせています
// https://platform.stability.ai/docs/api-reference#tag/v1generation/operation/textToImage
export type StableDiffusionParams = {
  text_prompts: {
    text: string;
    weight: number;
  }[];
  cfg_scale: number;
  seed: number;
  steps: number;
  style_preset?: string;
  init_image?: string;
  image_strength?: number;
};

// Titan Image
// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-image.html
export type TitanImageParams = {
  taskType: 'TEXT_IMAGE' | 'INPAINTING' | 'OUTPAINTING' | 'IMAGE_VARIATION';
  textToImageParams?: {
    text: string;
    negativeText?: string;
  };
  inPaintingParams?: {
    text?: string;
    negativeText?: string;
    image: string;
    maskPrompt?: string;
    maskImage?: string;
  };
  outPaintingParams?: {
    text?: string;
    negativeText?: string;
    image: string;
    maskPrompt?: string;
    maskImage?: string;
    outPaintingMode?: string;
  };
  imageVariationParams?: {
    text?: string;
    negativeText?: string;
    images: string[];
  };
  imageGenerationConfig: {
    numberOfImages: number;
    quality?: string;
    height: number;
    width: number;
    cfgScale: number;
    seed: number;
  };
};

export type BedrockImageGenerationResponse = {
  result: string;
  artifacts: {
    base64: string;
  }[];
  images: string[];
};
