import {
  Model,
  ModelConfiguration,
  ModelMetadata,
} from 'generative-ai-use-cases';
import {
  CRI_PREFIX_PATTERN,
  modelMetadata as originalModelMetadata,
} from '@generative-ai-use-cases/common';

const modelRegion = import.meta.env.VITE_APP_MODEL_REGION;

// Get model names and other environment variables
const bedrockModelConfigs = (
  JSON.parse(import.meta.env.VITE_APP_MODEL_IDS) as ModelConfiguration[]
)
  .map((model) => ({
    modelId: model.modelId.trim(),
    region: model.region.trim(),
  }))
  .filter((model) => model.modelId);
const bedrockModelIds: string[] = bedrockModelConfigs.map(
  (model) => model.modelId
);
const lightModelIds: string[] = bedrockModelConfigs
  .filter((model) => originalModelMetadata[model.modelId]?.flags?.light)
  .map((model) => model.modelId);
const modelIdsInModelRegion: string[] = bedrockModelConfigs
  .filter((model) => model.region === modelRegion)
  .map((model) => model.modelId);
const duplicateBaseModelIds = new Set(
  bedrockModelIds
    .map((modelId) => modelId.replace(CRI_PREFIX_PATTERN, ''))
    .filter((item, index, arr) => arr.indexOf(item) !== index)
);
const visionModelIds: string[] = bedrockModelIds.filter(
  (modelId) => originalModelMetadata[modelId]?.flags?.image
);
const visionEnabled: boolean = visionModelIds.length > 0;

const endpointNames: string[] = JSON.parse(
  import.meta.env.VITE_APP_ENDPOINT_NAMES
)
  .map((name: string) => name.trim())
  .filter((name: string) => name);

const imageModelConfigs = (
  JSON.parse(import.meta.env.VITE_APP_IMAGE_MODEL_IDS) as ModelConfiguration[]
)
  .map(
    (model: ModelConfiguration): ModelConfiguration => ({
      modelId: model.modelId.trim(),
      region: model.region.trim(),
    })
  )
  .filter((model) => model.modelId);
const imageGenModelIds: string[] = imageModelConfigs.map(
  (model) => model.modelId
);

const videoModelConfigs = (
  JSON.parse(import.meta.env.VITE_APP_VIDEO_MODEL_IDS) as ModelConfiguration[]
)
  .map(
    (model: ModelConfiguration): ModelConfiguration => ({
      modelId: model.modelId.trim(),
      region: model.region.trim(),
    })
  )
  .filter((model) => model.modelId);
const videoGenModelIds: string[] = videoModelConfigs.map(
  (model) => model.modelId
);
const speechToSpeechModelConfigs = (
  JSON.parse(
    import.meta.env.VITE_APP_SPEECH_TO_SPEECH_MODEL_IDS
  ) as ModelConfiguration[]
)
  .map(
    (model: ModelConfiguration): ModelConfiguration => ({
      modelId: model.modelId.trim(),
      region: model.region.trim(),
    })
  )
  .filter((model) => model.modelId);
const speechToSpeechModelIds: string[] = speechToSpeechModelConfigs.map(
  (model) => model.modelId
);

const agentNames: string[] = JSON.parse(import.meta.env.VITE_APP_AGENT_NAMES)
  .map((name: string) => name.trim())
  .filter((name: string) => name);

const getFlows = () => {
  try {
    return JSON.parse(import.meta.env.VITE_APP_FLOWS);
  } catch (e) {
    return [];
  }
};

const flows = getFlows();

// List of LangChain model IDs (configured to match config.yaml)
const liteLlmModelIds = ['gemini-2.5-flash', 'gemini-2.5-pro'];

// List of LangChain model IDs
const langchainModelIds = [
  // OpenAI
  'openai:gpt-4o',
  'openai:gpt-4o-mini',
  'openai:o3',
  'openai:gpt-4.1',
  'openai:gpt-5',
];

// Define model objects
const textModels = [
  ...bedrockModelConfigs.map(
    (model) =>
      ({
        modelId: model.modelId,
        type: 'bedrock',
        region: model.region,
      }) as Model
  ),
  ...endpointNames.map(
    (name) => ({ modelId: name, type: 'sagemaker' }) as Model
  ),
  // Temporary hardcoded addition of LiteLLM and LangChain models
  ...liteLlmModelIds.map((modelId) => ({ modelId, type: 'liteLlm' }) as Model),
  ...langchainModelIds.map(
    (modelId) => ({ modelId, type: 'langchain' }) as Model
  ),
];
const imageGenModels = [
  ...imageModelConfigs.map(
    (model) =>
      ({
        modelId: model.modelId,
        type: 'bedrock',
        region: model.region,
      }) as Model
  ),
];
const videoGenModels = [
  ...videoModelConfigs.map(
    (model) =>
      ({
        modelId: model.modelId,
        type: 'bedrock',
        region: model.region,
      }) as Model
  ),
];
const speechToSpeechModels = [
  ...speechToSpeechModelConfigs.map(
    (model) =>
      ({
        modelId: model.modelId,
        type: 'bedrock',
        region: model.region,
      }) as Model
  ),
];
const agentModels = [
  ...agentNames.map(
    (name) => ({ modelId: name, type: 'bedrockAgent' }) as Model
  ),
];

export const findModelByModelId = (modelId: string) => {
  const model = [
    ...textModels,
    ...imageGenModels,
    ...videoGenModels,
    ...agentModels,
  ].find((m) => m.modelId === modelId);

  if (model) {
    // deep copy
    return JSON.parse(JSON.stringify(model));
  }

  return undefined;
};

const searchAgent = agentNames.find((name) => name.includes('Search'));
const webSearchEnabled = import.meta.env.VITE_APP_WEB_SEARCH_ENABLED === 'true';

// Add metadata for liteLLM models (extended on frontend side)
const liteLlmModelMetadata: Record<string, ModelMetadata> = {
  'gemini-2.5-flash': {
    flags: { text: true, doc: true, image: true, video: false },
    displayName: 'Gemini 2.5 Flash',
    description: '幅広いファイル形式に対応した高速モデル',
  },
  'gemini-2.5-pro': {
    flags: { text: true, doc: true, image: true, video: false },
    displayName: 'Gemini 2.5 Pro',
    description: '幅広いファイル形式に対応した高性能モデル',
  },
};

const langchainModelMetadata: Record<string, ModelMetadata> = {
  'openai:gpt-4o': {
    flags: { text: true, doc: true, image: true, video: false },
    displayName: 'GPT 4o',
    description: 'レガシー モデル',
  },
  'openai:gpt-4o-mini': {
    flags: { text: true, doc: true, image: true, video: false },
    displayName: 'GPT 4o mini',
    description: '高速な処理が可能な軽量モデル',
  },
  'openai:o3': {
    flags: { text: true, doc: true, image: true, video: false },
    displayName: 'o3',
    description: '高度な推論を使用する',
  },
  'openai:gpt-4.1': {
    flags: { text: true, doc: true, image: true, video: false },
    displayName: 'GPT 4.1',
    description: '迅速なコーディングと分析に最適',
  },
  'openai:gpt-5': {
    flags: { text: true, doc: true, image: true, video: false },
    displayName: 'GPT 5',
    description: '高速な推論能力モデル',
  },
};

// Merge LangChain metadata with original modelMetadata
const modelMetadata: Record<string, ModelMetadata> = {
  ...liteLlmModelMetadata,
  ...langchainModelMetadata,
  ...originalModelMetadata,
};

const modelDisplayName = (modelId: string): string => {
  if (liteLlmModelMetadata[modelId]) {
    return liteLlmModelMetadata[modelId].displayName;
  }

  // Get display name from metadata for LangChain models
  if (langchainModelMetadata[modelId]) {
    return langchainModelMetadata[modelId].displayName;
  }

  // If there are multiple instances of the same model, add CRI suffix to the display name
  let displayName = modelMetadata[modelId]?.displayName ?? modelId;
  if (duplicateBaseModelIds.has(modelId.replace(CRI_PREFIX_PATTERN, ''))) {
    const criMatch = modelId.match(CRI_PREFIX_PATTERN);
    if (criMatch) {
      displayName += ` (${criMatch[1].toUpperCase()})`;
    }
  }
  return displayName;
};

// Featured models to display in the first level of the model selector
// These should match the actual model IDs available in the system
// Note: Claude Sonnet 4 model ID should be updated based on the actual Bedrock model ID
const featuredModelIds: string[] = [
  // Find Claude Sonnet 4 model (pattern: anthropic.claude-sonnet-4*)
  bedrockModelIds.find((id) => id.includes('claude-sonnet-4')) || '',
  'openai:gpt-5',
  'gemini-2.5-pro',
].filter((id) => id !== '');

export const MODELS = {
  modelRegion: modelRegion,
  modelIds: [
    ...bedrockModelIds,
    ...endpointNames,
    ...langchainModelIds,
    ...liteLlmModelIds,
  ],
  modelIdsInModelRegion,
  modelMetadata,
  modelDisplayName,
  lightModelIds,
  visionModelIds: visionModelIds,
  visionEnabled: visionEnabled,
  imageGenModelIds: imageGenModelIds,
  videoGenModelIds: videoGenModelIds,
  agentNames: agentNames,
  textModels: textModels,
  imageGenModels: imageGenModels,
  videoGenModels: videoGenModels,
  agentModels: agentModels,
  agentEnabled: agentNames.length > 0,
  searchAgent: searchAgent,
  webSearchEnabled: webSearchEnabled,
  flows,
  flowChatEnabled: flows.length > 0,
  speechToSpeechModelIds: speechToSpeechModelIds,
  speechToSpeechModels: speechToSpeechModels,
  featuredModelIds,
};
