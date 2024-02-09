import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  ConnectionType,
  Integration,
  IntegrationType,
  LambdaIntegration,
  RestApi,
  VpcLink,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Peer, Port, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  ContainerImage,
  CpuArchitecture,
  FargateTaskDefinition,
  LogDriver,
  OperatingSystemFamily,
  Protocol,
} from 'aws-cdk-lib/aws-ecs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { NetworkLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { ServiceLinkedRole } from 'upsert-slr';

export interface FileProps {
  userPool: UserPool;
  api: RestApi;
}

export class File extends Construct {
  constructor(scope: Construct, id: string, props: FileProps) {
    super(scope, id);

    // S3 (File Bucket)
    const fileBucket = new Bucket(this, 'FileBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    fileBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [HttpMethods.PUT],
      allowedHeaders: ['*'],
      exposedHeaders: [],
      maxAge: 3000,
    });

    // Lambda
    const getSignedUrlFunction = new NodejsFunction(this, 'GetSignedUrl', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/getMediaUploadSignedUrl.ts',
      timeout: Duration.minutes(15),
      environment: {
        BUCKET_NAME: fileBucket.bucketName,
      },
    });
    fileBucket.grantWrite(getSignedUrlFunction);

    // VPC
    const vpc = new Vpc(this, 'Vpc', {});

    // ECS
    const cluster = new Cluster(this, 'Cluster', {
      vpc: vpc,
    });

    new ServiceLinkedRole(this, 'EcsServiceLinkedRole', {
      awsServiceName: 'ecs.amazonaws.com',
    });

    const taskDefinition = new FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: 2048,
      memoryLimitMiB: 4096,
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.X86_64,
        operatingSystemFamily: OperatingSystemFamily.LINUX,
      },
    });

    taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [fileBucket.arnForObjects('*')],
      })
    );

    const taskLogGroup = new LogGroup(this, 'TaskLogGroup', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const container = taskDefinition.addContainer('Container', {
      image: ContainerImage.fromAsset('ecs/recognize-file', {
        platform: Platform.LINUX_AMD64,
      }),
      logging: LogDriver.awsLogs({
        streamPrefix: 'recognize-file',
        logGroup: taskLogGroup,
      }),
    });

    container.addPortMappings({
      protocol: Protocol.TCP,
      containerPort: 80,
      hostPort: 80,
    });

    taskLogGroup.grantWrite(container.taskDefinition.executionRole!);

    // NLB
    const loadBalancedFargateService = new NetworkLoadBalancedFargateService(
      this,
      'LoadBalancedFargateService',
      {
        cluster: cluster,
        memoryLimitMiB: 1024,
        cpu: 512,
        taskDefinition: taskDefinition,
      }
    );

    loadBalancedFargateService.service.connections.allowFrom(
      Peer.ipv4(vpc.vpcCidrBlock),
      Port.tcp(80)
    );

    // VPC Link
    const link = new VpcLink(this, 'link', {
      targets: [loadBalancedFargateService.loadBalancer],
    });

    // API Gateway
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    const fileResource = props.api.root.addResource('file');

    // POST: /file/recognize
    fileResource.addResource('recognize').addMethod(
      'POST',
      new Integration({
        type: IntegrationType.HTTP_PROXY,
        integrationHttpMethod: 'POST',
        options: {
          connectionType: ConnectionType.VPC_LINK,
          vpcLink: link,
        },
      }),
      commonAuthorizerProps
    );

    // POST: /file/url
    fileResource
      .addResource('url')
      .addMethod(
        'POST',
        new LambdaIntegration(getSignedUrlFunction),
        commonAuthorizerProps
      );
  }
}
