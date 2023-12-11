import bedrockApi from './bedrockApi';
import sagemakerApi from './sagemakerApi';

const api = {
  bedrock: bedrockApi,
  sagemaker: sagemakerApi,
};

export default api;
