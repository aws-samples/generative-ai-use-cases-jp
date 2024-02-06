import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  Effect,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';

export class Agent extends Construct {
  public readonly schemaUri: string;
  public readonly lambdaFunctionName: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // search api
    const searchApiKey = this.node.tryGetContext('searchApiKey') || '';

    // agents for bedrock の schema やデータを配置するバケット
    const s3Bucket = new Bucket(this, 'Bucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // schema を s3 に配置
    const schema = new BucketDeployment(this, 'ApiSchemaBucket', {
      sources: [Source.asset('assets/api-schema')],
      destinationBucket: s3Bucket,
      destinationKeyPrefix: 'api-schema',
    });

    // Lambda
    const bedrockAgentLambda = new NodejsFunction(this, 'BedrockAgentLambda', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/agent.ts',
      timeout: Duration.seconds(300),
      environment: {
        SEARCH_API_KEY: searchApiKey,
      },
    });
    bedrockAgentLambda.grantInvoke(
      new ServicePrincipal('bedrock.amazonaws.com')
    );

    // Agent
    const bedrockAgentRole = new Role(this, 'BedrockAgentRole', {
      assumedBy: new ServicePrincipal('bedrock.amazonaws.com'),
    });

    const bedrockAgentLambdaPolicy = new Policy(
      this,
      'BedrockAgentLambdaPolicy',
      {
        policyName: 'BedrockAgentLambdaPolicy',
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [bedrockAgentLambda.role?.roleArn || ''],
            actions: ['*'],
          }),
        ],
      }
    );

    const bedrockAgentS3BucketPolicy = new Policy(
      this,
      'BedrockAgentS3BucketPolicy',
      {
        policyName: 'BedrockAgentS3BucketPolicy',
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [s3Bucket.bucketArn, `${s3Bucket.bucketArn}/*`],
            actions: ['*'],
          }),
        ],
      }
    );

    const bedrockAgentBedrockModelPolicy = new Policy(
      this,
      'BedrockAgentBedrockModelPolicy',
      {
        policyName: 'BedrockAgentBedrockModelPolicy',
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: ['*'],
            actions: ['bedrock:*'],
          }),
        ],
      }
    );

    bedrockAgentBedrockModelPolicy.node.addDependency(bedrockAgentRole);
    bedrockAgentLambdaPolicy.node.addDependency(bedrockAgentRole);
    bedrockAgentS3BucketPolicy.node.addDependency(bedrockAgentRole);

    bedrockAgentRole.attachInlinePolicy(bedrockAgentLambdaPolicy);
    bedrockAgentRole.attachInlinePolicy(bedrockAgentS3BucketPolicy);
    bedrockAgentRole.attachInlinePolicy(bedrockAgentBedrockModelPolicy);

    this.lambdaFunctionName = bedrockAgentLambda.functionName;
    this.schemaUri = `s3://${schema.deployedBucket.bucketName}/api-schema/api-schema.json`;
  }
}
