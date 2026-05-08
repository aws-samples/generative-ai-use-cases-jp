import bedrockApi from './bedrockApi';
import bedrockAgentApi from './bedrockAgentApi';
import bedrockKbApi from './bedrockKbApi';
import sagemakerApi from './sagemakerApi';

const api = {
  bedrock: bedrockApi,
  bedrockAgent: bedrockAgentApi,
  bedrockKb: bedrockKbApi,
  sagemaker: sagemakerApi,
};

export default api;
