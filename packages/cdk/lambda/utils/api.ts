import bedrockApi from './bedrockApi';
import bedrockAgentApi from './bedrockAgentApi';
import bedrockKbApi from './bedrockKbApi';
import sagemakerApi from './sagemakerApi';
import liteLlmApi from './liteLlmApi';
import langchainApi from './langchainApi';

const api = {
  bedrock: bedrockApi,
  bedrockAgent: bedrockAgentApi,
  bedrockKb: bedrockKbApi,
  sagemaker: sagemakerApi,
  liteLlm: liteLlmApi,
  langchain: langchainApi,
};

export default api;
