export type AgentInput = {
  actionGroup: string;
  apiPath: string;
  httpMethod: string;
  requestBody: {
    content: {
      'application/json': {
        properties: {
          name: string;
          type: string;
          value: string;
        }[];
      };
    };
  };
};

export type AgentOutput = {
  messageVersion: string;
  response: {
    actionGroup: string;
    apiPath: string;
    httpMethod: string;
    httpStatusCode: number;
    responseBody: {
      'application/json': {
        body: string;
      };
    };
  };
};

export type BraveSearchResult = {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
};
