import { APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      modelType: process.env.MODEL_TYPE,
      modelRegion: process.env.MODEL_REGION,
      modelName: process.env.MODEL_NAME,
      promptTemplateFile: process.env.PROMPT_TEMPLATE_FILE,
      imageGenModelName: process.env.IMAGE_GEN_MODEL_NAME,
    }),
  };
};
