import { Construct } from 'constructs';
import * as sagemaker from '@aws-cdk/aws-sagemaker-alpha';
import { Model } from 'generative-ai-use-cases-jp';

type SageMakerModel = {
  name: string;
  env: Record<string, string>;
};

// モデルの定義

// const DEFAULT_ENV = {
//   SM_NUM_GPUS: '1',
//   DTYPE: 'bfloat16',
//   MAX_INPUT_LENGTH: '2048',
//   MAX_TOTAL_TOKENS: '4096',
//   MAX_BATCH_TOTAL_TOKENS: '8192',
// };

// ここにモデル定義を追加
// name は packages/cdk/lambda/utils/promptTemplates.ts でプロンプトテンプレート参照の際に利用される。(llama-2 のプロンプトであれば name に llama-2 が含まれるか確認する)
// HF_MODEL_ID は Huggingface ID か S3 URI が指定可能
const models: SageMakerModel[] = [
  // {
  //   name: 'elyza-japanese-llama-2-7b-instruct',
  //   env: {
  //     ...DEFAULT_ENV,
  //     HF_MODEL_ID: 'elyza/ELYZA-japanese-Llama-2-7b-instruct',
  //   },
  // },
];

export class LLM extends Construct {
  public readonly models: Model[] = models.map((m) => {
    return {
      type: 'sagemaker',
      modelName: m.name,
    };
  });
  public readonly deploy_suffix: string =
    '-' + new Date().toISOString().replace(/[:T-]/g, '').split('.')[0];
  public readonly endpointConfigName = 'generative-ai-usecases-endpoint-config';
  public readonly endpointName = 'generative-ai-usecases-endpoint';

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Get Container Image
    // https://github.com/aws/deep-learning-containers/blob/master/available_images.md
    const repositoryName = 'huggingface-pytorch-tgi-inference';
    const tag = '2.0.1-tgi1.1.0-gpu-py39-cu118-ubuntu20.04';
    const image = sagemaker.ContainerImage.fromDlc(repositoryName, tag);

    // モデルがなければエンドポイントを作成しない
    if (models.length > 0) {
      // Create Models
      const sm_models = models.map((model) => {
        const sm_model = new sagemaker.Model(
          this,
          `sagemaker-model-${model.name}`,
          {
            modelName: model.name + this.deploy_suffix,
            containers: [
              {
                image: image,
                environment: model.env,
              },
            ],
          }
        );
        return sm_model;
      });

      // Create Endpoint Config
      const endpointConfig = new sagemaker.EndpointConfig(
        this,
        'EndpointConfig',
        {
          endpointConfigName: this.endpointConfigName + this.deploy_suffix,
          instanceProductionVariants: models.map((modelConfig, idx) => {
            return {
              model: sm_models[idx],
              variantName: modelConfig.name,
              initialVariantWeight: 1,
              initialInstanceCount: 1,
              instanceType: sagemaker.InstanceType.G5_2XLARGE,
            };
          }),
        }
      );
      sm_models.forEach((sm_model) =>
        endpointConfig.node.addDependency(sm_model)
      );
    }
  }
}
