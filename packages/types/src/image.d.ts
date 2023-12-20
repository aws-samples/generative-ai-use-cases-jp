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
// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-diffusion-1-0-text-image.html
export type StableDiffusionParams = {
  text_prompts: {
    text: string;
    weight: number;
  }[];
  height?: string;
  width?: string;
  cfg_scale?: number;
  clip_guidance_preset?: string;
  sampler?: string;
  samples?: number;
  seed?: number;
  steps?: number;
  style_preset?: string;
  // Image to Image
  init_image?: string;
  init_image_mode?: string;
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
