import { AgentInput, AgentOutput } from 'generative-ai-use-cases';
import { StackInput } from '../lib/stack-input';
import { search } from './utils/webSearch';

export const handler = async (event: AgentInput): Promise<AgentOutput> => {
  try {
    // Params
    const props = event.requestBody.content['application/json'].properties;
    let keyword = '';
    for (const prop of props) {
      if (prop.name === 'keyword') {
        keyword = prop.value;
      }
    }

    const searchEngine = process.env
      .SEARCH_ENGINE as StackInput['searchEngine'];

    const results = await search(keyword, searchEngine);

    // Create Response Object
    const response_body = {
      'application/json': {
        body: `<search_results>${JSON.stringify(results)}</search_results>`,
      },
    };
    const action_response = {
      actionGroup: event.actionGroup,
      apiPath: event.apiPath,
      httpMethod: event.httpMethod,
      httpStatusCode: 200,
      responseBody: response_body,
    };
    const api_response = {
      messageVersion: '1.0',
      response: action_response,
    };

    return api_response;
  } catch (error: unknown) {
    console.log(error);
    const action_response = {
      actionGroup: event.actionGroup,
      apiPath: event.apiPath,
      httpMethod: event.httpMethod,
      httpStatusCode: 500,
      responseBody: {
        'application/json': {
          body: 'Internal Server Error',
        },
      },
    };
    const api_response = {
      messageVersion: '1.0',
      response: action_response,
    };
    return api_response;
  }
};
