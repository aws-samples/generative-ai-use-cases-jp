import { APIGatewayProxyResult } from 'aws-lambda';
import { SettingResponse } from 'generative-ai-use-cases-jp';
import api from './utils/api';

export const handler = async (): Promise<APIGatewayProxyResult> => {
  // 複数 await を行っているが初回以降はキャッシュにより高速
  const bedrock_models = await api.bedrock.getSupportedModels();
  const sagemaker_models = await api.sagemaker.getSupportedModels();
  const bedrock_image_models = await api.bedrock.getSupportedImageModels();
  const sagemaker_image_models = await api.sagemaker.getSupportedImageModels();

  const body: SettingResponse = {
    modelRegion: process.env.MODEL_REGION || '',
    models: [...bedrock_models, ...sagemaker_models],
    imageGenModels: [...bedrock_image_models, ...sagemaker_image_models],
  };
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
};
