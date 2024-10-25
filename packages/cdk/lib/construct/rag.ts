import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctionsTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Duration, Token, Arn, RemovalPolicy } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

const KENDRA_STATE_CFN_PARAMETER_NAME = 'kendraState';

export interface RagProps {
  userPool: UserPool;
  api: RestApi;
}

interface IndexScheduleCron {
  minute: string;
  hour: string;
  month: string;
  weekDay: string;
}

class KendraIndexWithCfnParameter extends kendra.CfnIndex {
  attrId: string;
  attrArn: string;

  constructor(
    scope: Construct,
    id: string,
    props: kendra.CfnIndexProps,
    kendraSwitchCfnCondition: cdk.CfnCondition
  ) {
    super(scope, id, props);

    this.attrId = cdk.Fn.conditionIf(
      kendraSwitchCfnCondition.logicalId,
      this.attrId, // kendraがオンの場合は、attrIdをそのまま返す
      `` // kendraがオフの場合は、空文字列を設定しておく
    ).toString();

    this.attrArn = cdk.Fn.conditionIf(
      kendraSwitchCfnCondition.logicalId,
      this.attrArn, // kendraがオンの場合は、attrArnをそのまま返す
      `arn:aws:kendra:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:index/` // kendraがオフの場合は、index/以降を空文字列にする（IAMの許可をさせない）
    ).toString();
  }
}

class KendraDataSourceWithCfnParameter extends kendra.CfnDataSource {
  attrId: string;
  attrArn: string;

  constructor(
    scope: Construct,
    id: string,
    props: kendra.CfnDataSourceProps,
    kendraSwitchCfnCondition: cdk.CfnCondition
  ) {
    super(scope, id, props);

    this.attrId = cdk.Fn.conditionIf(
      kendraSwitchCfnCondition.logicalId,
      this.attrId, // kendraがオンの場合は、attrIdをそのまま返す
      `` // kendraがオフの場合は、空文字列を設定しておく
    ).toString();

    this.attrArn = cdk.Fn.conditionIf(
      kendraSwitchCfnCondition.logicalId,
      this.attrArn, // kendraがオンの場合は、attrArnをそのまま返す
      `arn:aws:kendra:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:index/*/data-source/` // kendraがオフの場合は、index/以降を空文字列にする（IAMの許可をさせない）
    ).toString();
  }
}

/**
 * RAG を実行するためのリソースを作成する
 */
export class Rag extends Construct {
  public readonly dataSourceBucketName?: string;

  constructor(scope: Construct, id: string, props: RagProps) {
    super(scope, id);

    const kendraIndexArnInCdkContext =
      this.node.tryGetContext('kendraIndexArn');

    const kendraDataSourceBucketName = this.node.tryGetContext(
      'kendraDataSourceBucketName'
    );

    const kendraIndexScheduleEnabled: boolean = this.node.tryGetContext(
      'kendraIndexScheduleEnabled'
    );
    const kendraIndexScheduleCreateCron: IndexScheduleCron | null =
      this.node.tryGetContext('kendraIndexScheduleCreateCron');
    const kendraIndexScheduleDeleteCron: IndexScheduleCron | null =
      this.node.tryGetContext('kendraIndexScheduleDeleteCron');

    let kendraIndexArn: string;
    let kendraIndexId: string;
    let dataSourceBucket: s3.IBucket | null = null;

    if (kendraIndexArnInCdkContext) {
      // 既存の Kendra Index を利用する場合
      kendraIndexArn = kendraIndexArnInCdkContext!;
      kendraIndexId = Arn.extractResourceName(
        kendraIndexArnInCdkContext,
        'index'
      );
      // 既存の S3 データソースを利用する場合は、バケット名からオブジェクトを生成
      if (kendraDataSourceBucketName) {
        dataSourceBucket = s3.Bucket.fromBucketName(
          this,
          'DataSourceBucket',
          kendraDataSourceBucketName
        );
      }
    } else {
      // 新規に Kendra Index を作成する場合
      const indexRole = new iam.Role(this, 'KendraIndexRole', {
        assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
      });

      indexRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: ['s3:GetObject'],
        })
      );

      indexRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
      );

      const accessLogsBucket = new s3.Bucket(
        this,
        'DataSourceAccessLogsBucket',
        {
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
          encryption: s3.BucketEncryption.S3_MANAGED,
          autoDeleteObjects: true,
          removalPolicy: RemovalPolicy.DESTROY,
          objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
          enforceSSL: true,
        }
      );

      // .pdf や .txt などのドキュメントを格納する S3 Bucket
      dataSourceBucket = new s3.Bucket(this, 'DataSourceBucket', {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY,
        objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
        serverAccessLogsBucket: accessLogsBucket,
        serverAccessLogsPrefix: 'AccessLogs/',
        enforceSSL: true,
      });

      // /kendra/docs ディレクトリを Bucket にアップロードする
      new s3Deploy.BucketDeployment(this, 'DeployDocs', {
        sources: [s3Deploy.Source.asset('./rag-docs')],
        destinationBucket: dataSourceBucket,
        // 以前の設定で同 Bucket にアクセスログが残っている可能性があるため、この設定は残す
        exclude: ['AccessLogs/*', 'logs*'],
      });

      let index: kendra.CfnIndex;
      const indexProps: kendra.CfnIndexProps = {
        name: 'generative-ai-use-cases-index',
        edition: 'DEVELOPER_EDITION',
        roleArn: indexRole.roleArn,

        // トークンベースのアクセス制御を実施
        // 参考: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kendra-index.html#cfn-kendra-index-usercontextpolicy
        userContextPolicy: 'USER_TOKEN',

        // 認可に利用する Cognito の情報を設定
        userTokenConfigurations: [
          {
            jwtTokenTypeConfiguration: {
              keyLocation: 'URL',
              userNameAttributeField: 'cognito:username',
              groupAttributeField: 'cognito:groups',
              url: `${props.userPool.userPoolProviderUrl}/.well-known/jwks.json`,
            },
          },
        ],
      };

      let kendraIsOnCfnCondition;
      if (kendraIndexScheduleEnabled) {
        // Cloudfomation Parameterの読み込み
        const kendraStateCfnParameter = new cdk.CfnParameter(
          scope,
          KENDRA_STATE_CFN_PARAMETER_NAME,
          {
            // NOTE contructの名前が付加されないように、thisではなくscopeを指定する
            type: 'String',
            description:
              'parameter to create kendra index. on: create kendra index, off: delete kendra index.',
            allowedValues: ['on', 'off'],
            default: 'on',
          }
        );
        kendraIsOnCfnCondition = new cdk.CfnCondition(
          scope,
          'IsKendraOnCondition',
          {
            expression: cdk.Fn.conditionEquals(
              kendraStateCfnParameter.valueAsString,
              'on'
            ),
          }
        );

        index = new KendraIndexWithCfnParameter(
          this,
          'KendraIndex',
          indexProps,
          kendraIsOnCfnCondition
        );
        index.cfnOptions.condition = kendraIsOnCfnCondition; // Cfn Parameterに応じて、リソースをオンオフする

        kendraIndexArn = index.attrArn;
        kendraIndexId = index.attrId;
      } else {
        index = new kendra.CfnIndex(this, 'KendraIndex', indexProps);

        kendraIndexArn = Token.asString(index.getAtt('Arn'));
        kendraIndexId = index.ref;
      }

      const s3DataSourceRole = new iam.Role(this, 'DataSourceRole', {
        assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
      });

      s3DataSourceRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}`],
          actions: ['s3:ListBucket'],
        })
      );

      s3DataSourceRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}/*`],
          actions: ['s3:GetObject'],
        })
      );

      s3DataSourceRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [index.attrArn],
          actions: ['kendra:BatchPutDocument', 'kendra:BatchDeleteDocument'],
        })
      );

      let dataSource: kendra.CfnDataSource;
      const dataSourceProps: kendra.CfnDataSourceProps = {
        indexId: index.attrId,
        type: 'S3',
        name: 's3-data-source',
        roleArn: s3DataSourceRole.roleArn,
        languageCode: 'ja',
        dataSourceConfiguration: {
          s3Configuration: {
            bucketName: dataSourceBucket.bucketName,
            inclusionPrefixes: ['docs'],
          },
        },
      };
      if (kendraIndexScheduleEnabled) {
        dataSource = new KendraDataSourceWithCfnParameter(
          this,
          'S3DataSource',
          dataSourceProps,
          kendraIsOnCfnCondition as cdk.CfnCondition
        );
        dataSource.cfnOptions.condition = kendraIsOnCfnCondition; // Cfn Parameterに応じて、リソースをオンオフする
      } else {
        dataSource = new kendra.CfnDataSource(
          this,
          'S3DataSource',
          dataSourceProps
        );
      }
      dataSource.addDependency(index);

      if (kendraIndexScheduleEnabled) {
        if (kendraIndexScheduleCreateCron) {
          const taskStartDataSourceSyncJob =
            new stepfunctionsTasks.CallAwsService(
              this,
              'TaskStartDataSourceSyncJob',
              {
                service: 'kendra',
                action: 'startDataSourceSyncJob',
                parameters: {
                  IndexId: index.attrId,
                  Id: dataSource.attrId,
                },
                iamResources: [
                  // NOTE インデックス・データソースの両方に対する権限が必要
                  index.attrArn,
                  dataSource.attrArn,
                ],
              }
            );

          const definitionStartDataSourceSyncJob = stepfunctions.Chain.start(
            taskStartDataSourceSyncJob
          );

          const stateMachineStartDataSourceSyncJob =
            new stepfunctions.StateMachine(
              this,
              'StepFunctionsStateMachineStartDataSourceSyncJob',
              {
                definitionBody: stepfunctions.DefinitionBody.fromChainable(
                  definitionStartDataSourceSyncJob
                ),
                timeout: cdk.Duration.minutes(180),
              }
            );

          // Kendra On用のStep Functions
          const taskUpdateCloudformationStackWithKendraOn =
            new stepfunctionsTasks.CallAwsService(
              this,
              'TaskUpdateCloudformationStackWithKendraOn',
              {
                service: 'cloudformation',
                action: 'updateStack',
                parameters: {
                  StackName: cdk.Stack.of(this).stackName,
                  UsePreviousTemplate: true,
                  Parameters: [
                    {
                      ParameterKey: KENDRA_STATE_CFN_PARAMETER_NAME,
                      ParameterValue: 'on',
                    },
                  ],
                  Capabilities: ['CAPABILITY_IAM'],
                },
                iamResources: [cdk.Stack.of(this).stackId], // NOTE stackId (arn:aws:cloudformation:ap-northeast-1:123456789012:stack/myStack/i-01234567890abcdef0) can be used an Resource ARN
              }
            );

          const taskCheckCloudformationState =
            new stepfunctionsTasks.CallAwsService(
              this,
              'TaskCheckCloudformationState',
              {
                service: 'cloudformation',
                action: 'describeStacks',
                parameters: {
                  StackName: cdk.Stack.of(this).stackName,
                },
                iamResources: [cdk.Stack.of(this).stackId], // NOTE stackId (arn:aws:cloudformation:ap-northeast-1:123456789012:stack/myStack/i-01234567890abcdef0) can be used an Resource ARN
              }
            );

          const taskCallStartDataSourceSyncJob =
            new stepfunctionsTasks.StepFunctionsStartExecution(
              this,
              'TaskCallStateMachineStartDataSourceSyncJob',
              {
                stateMachine: stateMachineStartDataSourceSyncJob,
                integrationPattern: stepfunctions.IntegrationPattern.RUN_JOB,
              }
            );

          const definitionKendraOn = stepfunctions.Chain.start(
            taskUpdateCloudformationStackWithKendraOn
          )
            .next(taskCheckCloudformationState)
            .next(
              new stepfunctions.Choice(
                this,
                'TaskChoiceWithCloudformationState'
              )
                .when(
                  stepfunctions.Condition.stringEquals(
                    '$.Stacks[0].StackStatus',
                    'UPDATE_IN_PROGRESS'
                  ), // 完了するまでループ
                  new stepfunctions.Wait(this, 'TaskWaitCloudformationChange', {
                    time: stepfunctions.WaitTime.duration(
                      cdk.Duration.minutes(5)
                    ),
                  }).next(taskCheckCloudformationState) // ループ
                )
                .otherwise(
                  // 完了したら、次ステップ
                  // データソースSyncのStateMachineを呼び出す
                  taskCallStartDataSourceSyncJob
                )
            );

          const stateMachineKendraOn = new stepfunctions.StateMachine(
            this,
            'StepFunctionsStateMachineKendraOn',
            {
              definitionBody:
                stepfunctions.DefinitionBody.fromChainable(definitionKendraOn),
              timeout: cdk.Duration.minutes(180),
            }
          );

          // cronJobKendraOn
          new events.Rule(this, 'CronJobKendraOn', {
            schedule: events.Schedule.cron({
              minute: kendraIndexScheduleCreateCron.minute,
              hour: kendraIndexScheduleCreateCron.hour,
              month: kendraIndexScheduleCreateCron.month,
              weekDay: kendraIndexScheduleCreateCron.weekDay,
            }), // NOTE UTC時間で指定
            targets: [new targets.SfnStateMachine(stateMachineKendraOn, {})],
          });
        }

        if (kendraIndexScheduleDeleteCron) {
          // Kendra Off用のStep Function
          const taskUpdateCloudformationStackWithKendraOff =
            new stepfunctionsTasks.CallAwsService(
              this,
              'TaskUpdateCloudformationStackWithKendraOff',
              {
                service: 'cloudformation',
                action: 'updateStack',
                parameters: {
                  StackName: cdk.Stack.of(this).stackName,
                  UsePreviousTemplate: true,
                  Parameters: [
                    {
                      ParameterKey: KENDRA_STATE_CFN_PARAMETER_NAME,
                      ParameterValue: 'off',
                    },
                  ],
                  Capabilities: ['CAPABILITY_IAM'],
                },
                iamResources: [cdk.Stack.of(this).stackId],
              }
            );

          const definitionKendraOff = stepfunctions.Chain.start(
            taskUpdateCloudformationStackWithKendraOff
          );

          const stateMachineKendraOff = new stepfunctions.StateMachine(
            this,
            'StepFunctionsStateMachineKendraOff',
            {
              definitionBody:
                stepfunctions.DefinitionBody.fromChainable(definitionKendraOff),
              timeout: cdk.Duration.minutes(180),
            }
          );

          // cronJobKendraOff
          new events.Rule(this, 'CronJobKendraOff', {
            schedule: events.Schedule.cron({
              minute: kendraIndexScheduleDeleteCron.minute,
              hour: kendraIndexScheduleDeleteCron.hour,
              month: kendraIndexScheduleDeleteCron.month,
              weekDay: kendraIndexScheduleDeleteCron.weekDay,
            }), // NOTE UTC時間で指定
            targets: [new targets.SfnStateMachine(stateMachineKendraOff, {})],
          });
        }
      }
    }

    // RAG 関連の API を追加する
    // Lambda
    const queryFunction = new NodejsFunction(this, 'Query', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/queryKendra.ts',
      timeout: Duration.minutes(15),
      bundling: {
        // 新しい Kendra の機能を使うため、AWS SDK を明示的にバンドルする
        externalModules: [],
      },
      environment: {
        INDEX_ID: kendraIndexId,
      },
    });
    queryFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [kendraIndexArn],
        actions: ['kendra:Query'],
      })
    );

    const retrieveFunction = new NodejsFunction(this, 'Retrieve', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/retrieveKendra.ts',
      timeout: Duration.minutes(15),
      bundling: {
        // 新しい Kendra の機能を使うため、AWS SDK を明示的にバンドルする
        externalModules: [],
      },
      environment: {
        INDEX_ID: kendraIndexId,
      },
    });
    retrieveFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [kendraIndexArn],
        actions: ['kendra:Retrieve'],
      })
    );

    // API Gateway
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };
    const ragResource = props.api.root.addResource('rag');

    const queryResource = ragResource.addResource('query');
    // POST: /rag/query
    queryResource.addMethod(
      'POST',
      new LambdaIntegration(queryFunction),
      commonAuthorizerProps
    );

    const retrieveResource = ragResource.addResource('retrieve');
    // POST: /rag/retrieve
    retrieveResource.addMethod(
      'POST',
      new LambdaIntegration(retrieveFunction),
      commonAuthorizerProps
    );

    this.dataSourceBucketName = dataSourceBucket?.bucketName;
  }
}
