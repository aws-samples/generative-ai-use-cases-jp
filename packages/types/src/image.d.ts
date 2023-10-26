// パラメータは Stable Diffusion XL に合わせています
// https://platform.stability.ai/docs/api-reference#tag/v1generation/operation/textToImage
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
