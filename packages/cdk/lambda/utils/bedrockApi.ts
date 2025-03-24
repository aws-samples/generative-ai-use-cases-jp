import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  ConverseStreamCommand,
  ConverseStreamCommandInput,
  ConverseStreamOutput,
  ServiceQuotaExceededException,
  ThrottlingException,
  AccessDeniedException,
  StartAsyncInvokeCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  ApiInterface,
  BedrockImageGenerationResponse,
  GenerateImageParams,
  GenerateVideoParams,
  Model,
  StreamingChunk,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';
import {
  BEDROCK_TEXT_GEN_MODELS,
  BEDROCK_IMAGE_GEN_MODELS,
  BEDROCK_VIDEO_GEN_MODELS,
} from './models';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { streamingChunk } from './streamingChunk';

const defaultRegion = process.env.MODEL_REGION as string;

// STSから一時的な認証情報を取得する関数
const assumeRole = async (crossAccountBedrockRoleArn: string) => {
  const stsClient = new STSClient({ region: defaultRegion });
  const command = new AssumeRoleCommand({
    RoleArn: crossAccountBedrockRoleArn,
    RoleSessionName: 'BedrockApiAccess',
  });

  try {
    const response = await stsClient.send(command);
    if (response.Credentials) {
      return {
        accessKeyId: response.Credentials?.AccessKeyId,
        secretAccessKey: response.Credentials?.SecretAccessKey,
        sessionToken: response.Credentials?.SessionToken,
      };
    } else {
      throw new Error('認証情報を取得できませんでした。');
    }
  } catch (error) {
    console.error('Error assuming role: ', error);
    throw error;
  }
};

// BedrockRuntimeClient を初期化するこの関数は、通常では単純に BedrockRuntimeClient を環境変数で指定されたリージョンで初期化します。
// 特別なケースとして、異なる AWS アカウントに存在する Bedrock リソースを利用したい場合があります。
// そのような場合、CROSS_ACCOUNT_BEDROCK_ROLE_ARN 環境変数が設定されているかをチェックします。(cdk.json で crossAccountBedrockRoleArn が設定されている場合に環境変数として設定される)
// 設定されている場合、指定されたロールを AssumeRole 操作によって引き受け、取得した一時的な認証情報を用いて BedrockRuntimeClient を初期化します。
// これにより、別の AWS アカウントの Bedrock リソースへのアクセスが可能になります。
export const initBedrockClient = async (region: string) => {
  // CROSS_ACCOUNT_BEDROCK_ROLE_ARN が設定されているかチェック
  if (process.env.CROSS_ACCOUNT_BEDROCK_ROLE_ARN) {
    // STS から一時的な認証情報を取得してクライアントを初期化
    const tempCredentials = await assumeRole(
      process.env.CROSS_ACCOUNT_BEDROCK_ROLE_ARN
    );

    if (
      !tempCredentials.accessKeyId ||
      !tempCredentials.secretAccessKey ||
      !tempCredentials.sessionToken
    ) {
      throw new Error('STSからの認証情報が不完全です。');
    }

    return new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: tempCredentials.accessKeyId,
        secretAccessKey: tempCredentials.secretAccessKey,
        sessionToken: tempCredentials.sessionToken,
      },
    });
  } else {
    // STSを使用しない場合のクライアント初期化
    return new BedrockRuntimeClient({
      region,
    });
  }
};

const createConverseCommandInput = (
  model: Model,
  messages: UnrecordedMessage[],
  id: string
): ConverseCommandInput => {
  const modelConfig = BEDROCK_TEXT_GEN_MODELS[model.modelId];
  return modelConfig.createConverseCommandInput(
    messages,
    id,
    model,
    modelConfig.defaultParams,
    modelConfig.usecaseParams
  );
};

const createConverseStreamCommandInput = (
  model: Model,
  messages: UnrecordedMessage[],
  id: string
): ConverseStreamCommandInput => {
  const modelConfig = BEDROCK_TEXT_GEN_MODELS[model.modelId];
  return modelConfig.createConverseStreamCommandInput(
    messages,
    id,
    model,
    modelConfig.defaultParams,
    modelConfig.usecaseParams
  );
};

const extractConverseOutput = (
  model: Model,
  output: ConverseCommandOutput
): StreamingChunk => {
  const modelConfig = BEDROCK_TEXT_GEN_MODELS[model.modelId];
  return modelConfig.extractConverseOutput(output);
};

const extractConverseStreamOutput = (
  model: Model,
  output: ConverseStreamOutput
): StreamingChunk => {
  const modelConfig = BEDROCK_TEXT_GEN_MODELS[model.modelId];
  return modelConfig.extractConverseStreamOutput(output);
};

const createBodyImage = (model: Model, params: GenerateImageParams): string => {
  const modelConfig = BEDROCK_IMAGE_GEN_MODELS[model.modelId];
  return modelConfig.createBodyImage(params);
};

const extractOutputImage = (
  model: Model,
  response: BedrockImageGenerationResponse
): string => {
  const modelConfig = BEDROCK_IMAGE_GEN_MODELS[model.modelId];
  return modelConfig.extractOutputImage(response);
};

const createBodyVideo = (model: Model, params: GenerateVideoParams) => {
  const modelConfig = BEDROCK_VIDEO_GEN_MODELS[model.modelId];
  return modelConfig.createBodyVideo(params);
};

const bedrockApi: Omit<ApiInterface, 'invokeFlow'> = {
  invoke: async (model, messages, id) => {
    const region = model.region || defaultRegion;
    const client = await initBedrockClient(region);

    const converseCommandInput = createConverseCommandInput(
      model,
      messages,
      id
    );
    const command = new ConverseCommand(converseCommandInput);
    const output = await client.send(command);

    return extractConverseOutput(model, output).text;
  },
  invokeStream: async function* (model, messages, id) {
    const region = model.region || defaultRegion;
    const client = await initBedrockClient(region);
    try {
      const converseStreamCommandInput = createConverseStreamCommandInput(
        model,
        messages,
        id
      );

      const command = new ConverseStreamCommand(converseStreamCommandInput);

      const responseStream = await client.send(command);

      if (!responseStream.stream) {
        return;
      }

      for await (const response of responseStream.stream) {
        if (!response) {
          break;
        }

        const output = extractConverseStreamOutput(model, response);

        if (output.text || output.trace) {
          yield streamingChunk({ text: output.text, trace: output.trace });
        }

        if (response.messageStop) {
          yield streamingChunk({
            text: '',
            stopReason: response.messageStop.stopReason,
          });
          break;
        }
      }
    } catch (e) {
      if (
        e instanceof ThrottlingException ||
        e instanceof ServiceQuotaExceededException
      ) {
        yield streamingChunk({
          text: 'ただいまアクセスが集中しているため時間をおいて試してみてください。',
          stopReason: 'error',
        });
      } else if (e instanceof AccessDeniedException) {
        const modelAccessURL = `https://${region}.console.aws.amazon.com/bedrock/home?region=${region}#/modelaccess`;
        yield streamingChunk({
          text: `選択したモデルが有効化されていないようです。[Bedrock コンソールの Model Access 画面](${modelAccessURL})にて、利用したいモデルを有効化してください。`,
          stopReason: 'error',
        });
      } else {
        console.error(e);
        yield streamingChunk({
          text:
            'エラーが発生しました。管理者に以下のエラーを報告してください。\n' +
            e,
          stopReason: 'error',
        });
      }
    }
  },
  generateImage: async (model, params) => {
    const region = model.region || defaultRegion;
    const client = await initBedrockClient(region);

    // Stable Diffusion や Titan Image Generator を利用した画像生成は Converse API に対応していないため、InvokeModelCommand を利用する
    const command = new InvokeModelCommand({
      modelId: model.modelId,
      body: createBodyImage(model, params),
      contentType: 'application/json',
    });
    const res = await client.send(command);
    const body = JSON.parse(Buffer.from(res.body).toString('utf-8'));

    return extractOutputImage(model, body);
  },
  generateVideo: async (model, params: GenerateVideoParams) => {
    const videoBucketRegionMap = JSON.parse(
      process.env.VIDEO_BUCKET_REGION_MAP ?? '{}'
    );
    const region = model.region || defaultRegion;
    const client = await initBedrockClient(region);
    const tmpOutputBucket = videoBucketRegionMap[region];

    if (!tmpOutputBucket || tmpOutputBucket.length === 0) {
      throw new Error('Video tmp buket is not defined');
    }

    const command = new StartAsyncInvokeCommand({
      modelId: model.modelId,
      modelInput: createBodyVideo(model, params),
      outputDataConfig: {
        s3OutputDataConfig: {
          s3Uri: `s3://${tmpOutputBucket}`,
        },
      },
    });
    const res = await client.send(command);
    return res.invocationArn!;
  },
};

export default bedrockApi;
