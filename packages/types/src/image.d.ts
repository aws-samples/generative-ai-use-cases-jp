export type ControlMode = 'CANNY_EDGE' | 'SEGMENTATION'
export type BaseGenerationMode =
  | 'TEXT_IMAGE'
  | 'IMAGE_VARIATION'
  | 'INPAINTING'
  | 'OUTPAINTING'
export type TitanImageV2GenerationMode =
  | 'IMAGE_CONDITIONING'
  | 'COLOR_GUIDED_GENERATION'
  | 'BACKGROUND_REMOVAL';
export type GenerationMode = BaseGenerationMode | TitanImageV2GenerationMode
// 標準化したパラメータ
export type GenerateImageParams = {
  taskType?:
  | 'TEXT_IMAGE'
  | 'IMAGE_VARIATION'
  | 'INPAINTING'
  | 'OUTPAINTING'
  | 'IMAGE_CONDITIONING'
  | 'COLOR_GUIDED_GENERATION'
  | 'BACKGROUND_REMOVAL';
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
  // Image to Image
  initImage?: string;
  // Inpaint / Outpaint
  maskImage?: string;
  maskPrompt?: string;
  // Color Guided Generation
  colors?: string[];
  // Image Conditioning
  controlStrength?: number;
  controlMode?: ControlMode;
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

export type TitanImageV2Params = Omit<TitanImageParams, 'taskType'> & {
  taskType:
    | TitanImageParams['taskType']
    | 'COLOR_GUIDED_GENERATION'
    | 'BACKGROUND_REMOVAL';
  textToImageParams?: TitanImageParams['textToImageParams'] & {
    conditionImage?: string; // base64 encoded image
    controlMode?: ControlMode;
    controlStrength?: number;
  };
  colorGuidedGenerationParams?: {
    text: string;
    negativeText?: string;
    referenceImage?: string; // base64 encoded image
    colors: string[]; // list of color hex codes
  };
  backgroundRemovalParams?: {
    image: string; // base64 encoded image
  };
};

export type BedrockImageGenerationResponse = {
  result: string;
  artifacts: {
    base64: string;
  }[];
  images: string[];
};
