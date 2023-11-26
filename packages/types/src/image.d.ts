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
