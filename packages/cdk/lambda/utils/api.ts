import bedrockApi from './bedrockApi';
import bedrockAgentApi from './bedrockAgentApi';
import sagemakerApi from './sagemakerApi';

const api = {
  bedrock: bedrockApi,
  bedrockAgent: bedrockAgentApi,
  sagemaker: sagemakerApi,
};

export default api;
