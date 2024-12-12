import { FeatureFlags } from 'generative-ai-use-cases-jp';

// Manage Model Feature
// https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html
const MODEL_FEATURE: Record<string, FeatureFlags> = {
  TEXT_ONLY: { text: true, doc: false, image: false, video: false },
  TEXT_DOC: { text: true, doc: true, image: false, video: false },
  TEXT_DOC_IMAGE: { text: true, doc: true, image: true, video: false },
  TEXT_DOC_IMAGE_VIDEO: { text: true, doc: true, image: true, video: true },
  IMAGE_GEN: { image_gen: true },
  VIDEO_GEN: { video_gen: true },
};
export const modelFeatureFlags: Record<string, FeatureFlags> = {
  // Anthropic
  'anthropic.claude-3-5-sonnet-20241022-v2:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'anthropic.claude-3-5-haiku-20241022-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'anthropic.claude-3-5-sonnet-20240620-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'anthropic.claude-3-opus-20240229-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'anthropic.claude-3-sonnet-20240229-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'anthropic.claude-3-haiku-20240307-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'us.anthropic.claude-3-5-sonnet-20241022-v2:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'us.anthropic.claude-3-5-haiku-20241022-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'us.anthropic.claude-3-5-sonnet-20240620-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'us.anthropic.claude-3-opus-20240229-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'us.anthropic.claude-3-sonnet-20240229-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'us.anthropic.claude-3-haiku-20240307-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'eu.anthropic.claude-3-5-sonnet-20240620-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'eu.anthropic.claude-3-sonnet-20240229-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'eu.anthropic.claude-3-haiku-20240307-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'apac.anthropic.claude-3-5-sonnet-20240620-v1:0':
    MODEL_FEATURE.TEXT_DOC_IMAGE,
  'apac.anthropic.claude-3-sonnet-20240229-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'apac.anthropic.claude-3-haiku-20240307-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'anthropic.claude-v2:1': MODEL_FEATURE.TEXT_DOC,
  'anthropic.claude-v2': MODEL_FEATURE.TEXT_DOC,
  'anthropic.claude-instant-v1': MODEL_FEATURE.TEXT_DOC,
  // Amazon Titan
  'amazon.titan-text-express-v1': MODEL_FEATURE.TEXT_DOC,
  'amazon.titan-text-premier-v1:0': MODEL_FEATURE.TEXT_ONLY,
  // Meta
  'meta.llama3-8b-instruct-v1:0': MODEL_FEATURE.TEXT_DOC,
  'meta.llama3-70b-instruct-v1:0': MODEL_FEATURE.TEXT_DOC,
  'meta.llama3-1-8b-instruct-v1:0': MODEL_FEATURE.TEXT_DOC,
  'meta.llama3-1-70b-instruct-v1:0': MODEL_FEATURE.TEXT_DOC,
  'meta.llama3-1-405b-instruct-v1:0': MODEL_FEATURE.TEXT_DOC,
  'us.meta.llama3-2-1b-instruct-v1:0': MODEL_FEATURE.TEXT_DOC,
  'us.meta.llama3-2-3b-instruct-v1:0': MODEL_FEATURE.TEXT_DOC,
  'us.meta.llama3-2-11b-instruct-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  'us.meta.llama3-2-90b-instruct-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE,
  // Mistral
  'mistral.mistral-7b-instruct-v0:2': MODEL_FEATURE.TEXT_DOC,
  'mistral.mixtral-8x7b-instruct-v0:1': MODEL_FEATURE.TEXT_DOC,
  'mistral.mistral-small-2402-v1:0': MODEL_FEATURE.TEXT_ONLY,
  'mistral.mistral-large-2402-v1:0': MODEL_FEATURE.TEXT_DOC,
  'mistral.mistral-large-2407-v1:0': MODEL_FEATURE.TEXT_DOC,
  // Cohere
  'cohere.command-r-v1:0': MODEL_FEATURE.TEXT_DOC,
  'cohere.command-r-plus-v1:0': MODEL_FEATURE.TEXT_DOC,
  // Amazon Nova
  'amazon.nova-pro-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE_VIDEO,
  'amazon.nova-lite-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE_VIDEO,
  'amazon.nova-micro-v1:0': MODEL_FEATURE.TEXT_ONLY,
  'us.amazon.nova-pro-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE_VIDEO,
  'us.amazon.nova-lite-v1:0': MODEL_FEATURE.TEXT_DOC_IMAGE_VIDEO,
  'us.amazon.nova-micro-v1:0': MODEL_FEATURE.TEXT_ONLY,
  // Stability AI Image Gen
  'stability.stable-diffusion-xl-v1': MODEL_FEATURE.IMAGE_GEN,
  'stability.sd3-large-v1:0': MODEL_FEATURE.IMAGE_GEN,
  'stability.stable-image-core-v1:0': MODEL_FEATURE.IMAGE_GEN,
  'stability.stable-image-ultra-v1:0': MODEL_FEATURE.IMAGE_GEN,
  // Amazon Image Gen
  'amazon.titan-image-generator-v2:0': MODEL_FEATURE.IMAGE_GEN,
  'amazon.titan-image-generator-v1': MODEL_FEATURE.IMAGE_GEN,
  'amazon.nova-canvas-v1:0': MODEL_FEATURE.IMAGE_GEN,
};
