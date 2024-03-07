import { RemovalPolicy } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CfnMethod,
  CfnStage,
  CognitoUserPoolsAuthorizer,
  ConnectionType,
  Integration,
  IntegrationType,
  RestApi,
  VpcLink,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
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

export interface RecognizeFileProps {
  userPool: UserPool;
  api: RestApi;
  fileBucket: Bucket;
}

export class RecognizeFile extends Construct {
  constructor(scope: Construct, id: string, props: RecognizeFileProps) {
    super(scope, id);

    const stage = props.api.deploymentStage.node.defaultChild as CfnStage;

    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    const fileResource =
      props.api.root.getResource('file') || props.api.root.addResource('file');

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
        resources: [props.fileBucket.arnForObjects('*')],
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
        publicLoadBalancer: false,
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
    stage.variables = {
      vpcLinkId: link.vpcLinkId,
    };

    // POST: /file/recognize
    const recognizeMethod = fileResource.addResource('recognize').addMethod(
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

    // REST API の Method で VPC Link を参照すると、正しく削除できない問題がある。
    // ステージ変数を利用するとその問題を回避できるため、ConnectionId (ここでは VPC Link ID) をステージ変数経由で使うように変更している。
    // (L2 Construct では ConnectionId を設定できないため、L1 Construct のプロパティを直接変更している)
    // 参考: https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/api-gateway-known-issues.html
    const cfnRecognizeMethod = recognizeMethod.node.defaultChild as CfnMethod;
    cfnRecognizeMethod.addPropertyOverride(
      'Integration.ConnectionId',
      '${stageVariables.vpcLinkId}'
    );
  }
}
