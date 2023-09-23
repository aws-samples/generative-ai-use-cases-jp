import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from "@aws-sdk/client-sagemaker-runtime";
import { Configuration, OpenAIApi } from 'openai';
import { PredictRequest } from 'generative-ai-use-cases-jp';
import { fetchOpenApiKey } from './secret';
import { messages_to_prompt } from './prompter';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: PredictRequest = JSON.parse(event.body!);
    let response = ""

    if (process.env.MODEL_TYPE == "bedrock") {
      // Bedrock
      response = "Implementation for Bedrock is coming soon."
    } else if (process.env.MODEL_TYPE == "sagemaker") {
      // SageMaker Huggingface TGI
      // SageMaker Runtime Client の初期化
      const client = new SageMakerRuntimeClient({ region: process.env.MODEL_REGION });

      // SageMaker API を使用してチャットの応答を取得
      const command = new InvokeEndpointCommand({
        EndpointName: process.env.MODEL_NAME,
        Body: JSON.stringify({
          inputs: messages_to_prompt(req.messages, process.env.PROMPT_TEMPLATE),
          parameters: {
            max_new_tokens: 512,
            return_full_text: false,
            do_sample: true,
            temperature: 0.3
          }
        }),
        ContentType: "application/json",
        Accept: "application/json"
      });
      const data = await client.send(command);

      response = JSON.parse(new TextDecoder().decode(data.Body))[0].generated_text
    } else {
      // OpenAI
      // Secret 情報の取得
      const apiKey = await fetchOpenApiKey();

      // OpenAI API の初期化
      const configuration = new Configuration({ apiKey });
      const openai = new OpenAIApi(configuration);

      // OpenAI API を使用してチャットの応答を取得
      const chatCompletion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: req.messages,
      });
      
      response = chatCompletion.data.choices[0].message!.content!
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
      body: response,
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
