import { Duration, Size } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  DockerImageFunction,
  DockerImageCode,
  Architecture,
  FunctionUrlAuthType,
  InvokeMode,
  HttpMethod,
} from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement, Effect, IGrantable } from 'aws-cdk-lib/aws-iam';
import { IdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';
import { NetworkMode } from 'aws-cdk-lib/aws-ecr-assets';

export interface LitellmProxyServerProps {
  readonly idPool: IdentityPool;
  readonly isSageMakerStudio: boolean;
  readonly modelRegion?: string;
  readonly crossAccountBedrockRoleArn?: string;
}

export class LitellmProxyServer extends Construct {
  public readonly endpoint: string;
  public readonly function: DockerImageFunction;

  constructor(scope: Construct, id: string, props: LitellmProxyServerProps) {
    super(scope, id);

    // Create the LiteLLM Proxy Server function
    this.function = new DockerImageFunction(this, 'LitellmProxyFunction', {
      code: DockerImageCode.fromImageAsset('./litellm-proxy-server', {
        networkMode: props.isSageMakerStudio
          ? NetworkMode.custom('sagemaker')
          : NetworkMode.DEFAULT,
      }),
      memorySize: 2048, // LiteLLM needs more memory for model management
      ephemeralStorageSize: Size.mebibytes(2048),
      timeout: Duration.minutes(15),
      architecture: Architecture.X86_64,
      environment: {
        AWS_LWA_INVOKE_MODE: 'RESPONSE_STREAM',
        AWS_LWA_PORT: '8000',
        AWS_LWA_READINESS_CHECK_PATH: '/health',
        BEDROCK_REGION: props.modelRegion || 'us-east-1',
        LITELLM_LOG: 'INFO',
      },
    });

    // Grant access to AWS Bedrock
    this.function.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
          'bedrock:ListFoundationModels',
          'bedrock:GetFoundationModel',
        ],
        resources: ['*'],
      })
    );

    // Grant access to cross-account Bedrock role if specified
    if (props.crossAccountBedrockRoleArn) {
      this.function.role?.addToPrincipalPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sts:AssumeRole'],
          resources: [props.crossAccountBedrockRoleArn],
        })
      );
    }

    // Create Function URL with IAM authentication for internal access
    const litellmEndpoint = this.function.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM,
      cors: {
        allowedOrigins: ['*'], // In production, consider restricting this
        allowedMethods: [HttpMethod.ALL],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
        ],
      },
      invokeMode: InvokeMode.RESPONSE_STREAM,
    });

    // Grant invoke permissions to authenticated users (for internal service access)
    litellmEndpoint.grantInvokeUrl(props.idPool.authenticatedRole);

    // Store the endpoint URL
    this.endpoint = litellmEndpoint.url;
  }

  /**
   * Grant invoke permissions to a specific IAM principal
   * This can be used to allow other Lambda functions to call the proxy
   */
  public grantInvoke(grantee: IGrantable) {
    return this.function.grantInvoke(grantee);
  }

  /**
   * Grant Function URL invoke permissions to a specific IAM principal
   */
  public grantInvokeUrl(grantee: IGrantable) {
    return this.function.grantInvokeUrl(grantee);
  }
}
