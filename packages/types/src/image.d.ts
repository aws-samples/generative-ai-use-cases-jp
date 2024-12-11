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
  imageStrength?: number;
  height: number;
  width: number;
  aspectRatio?: string;
  // Image to Image
  initImage?: string;
  // Inpaint / Outpaint
  maskImage?: string;
  maskPrompt?: string;
  maskMode?: 'INPAINTING' | 'OUTPAINTING';
};

// Stable Diffusion
// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-diffusion-1-0-text-image.html
export type StableDiffusionParams = {
  text_prompts: {
    text: string;
    weight: number;
  }[];
  height?: number;
  width?: number;
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
  // Image to Image (Masking)
  mask_source?: string;
  mask_image?: string;
};

export type StabilityAI2024ModelParams = {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  seed?: number;
  output_format?: string;
  // Image to Image
  image?: string;
  mode?: string;
  strength?: number;
};

// Titan Image
// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-image.html
// Amazon Nova
// https://docs.aws.amazon.com/nova/latest/userguide/image-gen-access.html
export type AmazonImageParams = {
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
    similarityStrength?: number;
  };
  imageGenerationConfig: {
    numberOfImages: number;
    quality?: string;
    height: number;
    width: number;
    cfgScale: number;
    seed?: number;
  };
};

export type BedrockImageGenerationResponse = {
  result: string;
  artifacts: {
    base64: string;
  }[];
  images: string[];
};

export type StabilityAI2024ModelResponse = {
  seeds: string[];
  finish_reasons: (string | null)[];
  images: string[];
};
