import bedrockApi from './bedrockApi';
import sagemakerApi from './sagemakerApi';

const modelType = process.env.MODEL_TYPE || 'bedrock';
const api =
  {
    bedrock: bedrockApi,
    sagemaker: sagemakerApi,
  }[modelType] || bedrockApi;

export default api;
