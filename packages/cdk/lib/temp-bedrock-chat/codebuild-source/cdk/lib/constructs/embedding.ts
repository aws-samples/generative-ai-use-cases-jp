import { Construct } from "constructs";
import * as path from "path";
import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
// import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { CfnPipe } from "aws-cdk-lib/aws-pipes";
import * as logs from "aws-cdk-lib/aws-logs";
import { IBucket } from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { excludeDockerImage } from "../constants/docker";
import {
  DockerImageCode,
  DockerImageFunction,
  IFunction,
} from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import { Database } from "./database";

export interface EmbeddingProps {
  readonly database: Database;
  readonly bedrockRegion: string;
  readonly documentBucket: IBucket;
  readonly bedrockCustomBotProject: codebuild.IProject;
  readonly enableRagReplicas: boolean;
}

export class Embedding extends Construct {
  readonly removalHandler: IFunction;
  private _updateSyncStatusHandler: IFunction;
  private _fetchStackOutputHandler: IFunction;
  private _StoreKnowledgeBaseIdHandler: IFunction;
  private _StoreGuardrailArnHandler: IFunction;
  private _pipeRole: iam.Role;
  private _stateMachine: sfn.StateMachine;
  private _removalHandler: IFunction;

  constructor(scope: Construct, id: string, props: EmbeddingProps) {
    super(scope, id);

    this.setupStateMachineHandlers(props)
      .setupStateMachine(props)
      .setupEventBridgePipe(props)
      .setupRemovalHandler(props);

    this.removalHandler = this._removalHandler;
  }

  private setupStateMachineHandlers(props: EmbeddingProps): this {
    const handlerRole = new iam.Role(this, "HandlerRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    handlerRole.addToPolicy(
      // Assume the table access role for row-level access control.
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [props.database.tableAccessRole.roleArn],
      })
    );
    handlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:*"],
        resources: ["*"],
      })
    );
    handlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResource",
          "cloudformation:DescribeStackResources",
        ],
        resources: [`*`],
      })
    );
    handlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );

    this._updateSyncStatusHandler = new DockerImageFunction(
      this,
      "UpdateSyncStatusHandler",
      {
        code: DockerImageCode.fromImageAsset(
          path.join(__dirname, "../backend"),
          {
            platform: Platform.LINUX_AMD64,
            file: "lambda.Dockerfile",
            cmd: [
              "embedding_statemachine.bedrock_knowledge_base.update_bot_status.handler",
            ],
            exclude: [...excludeDockerImage],
          }
        ),
        memorySize: 512,
        timeout: Duration.minutes(1),
        environment: {
          ACCOUNT: Stack.of(this).account,
          REGION: Stack.of(this).region,
          CONVERSATION_TABLE_NAME: props.database.conversationTable.tableName,
          BOT_TABLE_NAME: props.database.botTable.tableName,
          TABLE_ACCESS_ROLE_ARN: props.database.tableAccessRole.roleArn,
        },
        role: handlerRole,
        logRetention: logs.RetentionDays.THREE_MONTHS,
      }
    );

    this._fetchStackOutputHandler = new DockerImageFunction(
      this,
      "FetchStackOutputHandler",
      {
        code: DockerImageCode.fromImageAsset(
          path.join(__dirname, "../backend"),
          {
            platform: Platform.LINUX_AMD64,
            file: "lambda.Dockerfile",
            cmd: [
              "embedding_statemachine.bedrock_knowledge_base.fetch_stack_output.handler",
            ],
            exclude: [...excludeDockerImage],
          }
        ),
        memorySize: 512,
        timeout: Duration.minutes(1),
        role: handlerRole,
        environment: {
          BEDROCK_REGION: props.bedrockRegion,
        },
        logRetention: logs.RetentionDays.THREE_MONTHS,
      }
    );
    this._StoreKnowledgeBaseIdHandler = new DockerImageFunction(
      this,
      "StoreKnowledgeBaseIdHandler",
      {
        code: DockerImageCode.fromImageAsset(
          path.join(__dirname, "../backend"),
          {
            platform: Platform.LINUX_AMD64,
            file: "lambda.Dockerfile",
            cmd: [
              "embedding_statemachine.bedrock_knowledge_base.store_knowledge_base_id.handler",
            ],
            exclude: [...excludeDockerImage],
          }
        ),
        memorySize: 512,
        timeout: Duration.minutes(1),
        environment: {
          ACCOUNT: Stack.of(this).account,
          REGION: Stack.of(this).region,
          CONVERSATION_TABLE_NAME: props.database.conversationTable.tableName,
          BOT_TABLE_NAME: props.database.botTable.tableName,
          TABLE_ACCESS_ROLE_ARN: props.database.tableAccessRole.roleArn,
        },
        role: handlerRole,
        logRetention: logs.RetentionDays.THREE_MONTHS,
      }
    );
    this._StoreGuardrailArnHandler = new DockerImageFunction(
      this,
      "StoreGuardrailArnHandler",
      {
        code: DockerImageCode.fromImageAsset(
          path.join(__dirname, "../backend"),
          {
            platform: Platform.LINUX_AMD64,
            file: "lambda.Dockerfile",
            cmd: [
              "embedding_statemachine.guardrails.store_guardrail_arn.handler",
            ],
            exclude: [...excludeDockerImage],
          }
        ),
        memorySize: 512,
        timeout: Duration.minutes(1),
        environment: {
          ACCOUNT: Stack.of(this).account,
          REGION: Stack.of(this).region,
          CONVERSATION_TABLE_NAME: props.database.conversationTable.tableName,
          BOT_TABLE_NAME: props.database.botTable.tableName,
          TABLE_ACCESS_ROLE_ARN: props.database.tableAccessRole.roleArn,
        },
        role: handlerRole,
        logRetention: logs.RetentionDays.THREE_MONTHS,
      }
    );
    return this;
  }

  private setupStateMachine(props: EmbeddingProps): this {
    const extractFirstElement = new sfn.Pass(this, "ExtractFirstElement", {
      parameters: {
        "dynamodb.$": "$[0].dynamodb",
        "eventID.$": "$[0].eventID",
        "eventName.$": "$[0].eventName",
        "eventSource.$": "$[0].eventSource",
        "eventVersion.$": "$[0].eventVersion",
        "awsRegion.$": "$[0].awsRegion",
        "eventSourceARN.$": "$[0].eventSourceARN",
      },
      resultPath: "$",
    });

    const startCustomBotBuild = new tasks.CodeBuildStartBuild(
      this,
      "StartCustomBotBuild",
      {
        project: props.bedrockCustomBotProject,
        integrationPattern: sfn.IntegrationPattern.RUN_JOB,
        environmentVariablesOverride: {
          PK: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: sfn.JsonPath.stringAt("$.dynamodb.NewImage.PK.S"),
          },
          SK: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: sfn.JsonPath.stringAt("$.dynamodb.NewImage.SK.S"),
          },
          // Bucket name provisioned by the bedrock stack
          BEDROCK_CLAUDE_CHAT_DOCUMENT_BUCKET_NAME: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.documentBucket.bucketName,
          },
          // Source info e.g. file names, URLs, etc.
          KNOWLEDGE: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: sfn.JsonPath.stringAt(
              "States.JsonToString($.dynamodb.NewImage.Knowledge.M)"
            ),
          },
          // Bedrock Knowledge Base configuration
          BEDROCK_KNOWLEDGE_BASE: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: sfn.JsonPath.stringAt(
              "States.JsonToString($.dynamodb.NewImage.BedrockKnowledgeBase.M)"
            ),
          },
          BEDROCK_GUARDRAILS: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: sfn.JsonPath.stringAt(
              "States.JsonToString($.dynamodb.NewImage.GuardrailsParams.M)"
            ),
          },
          ENABLE_RAG_REPLICAS: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.enableRagReplicas.toString(),
          },
        },
        resultPath: "$.Build",
      }
    );

    const updateSyncStatusRunning = this.createUpdateSyncStatusTask(
      "UpdateSyncStatusRunning",
      "RUNNING"
    );

    const updateSyncStatusSucceeded = this.createUpdateSyncStatusTask(
      "UpdateSyncStatusSuccess",
      "SUCCEEDED",
      "Knowledge base sync succeeded"
    );

    const updateSyncStatusFailed = new tasks.LambdaInvoke(
      this,
      "UpdateSyncStatusFailed",
      {
        lambdaFunction: this._updateSyncStatusHandler,
        payload: sfn.TaskInput.fromObject({
          "cause.$": "$.Cause",
        }),
        resultPath: sfn.JsonPath.DISCARD,
      }
    );

    const fallback = updateSyncStatusFailed.next(
      new sfn.Fail(this, "Fail", {
        cause: "Knowledge base sync failed",
        error: "Knowledge base sync failed",
      })
    );
    startCustomBotBuild.addCatch(fallback);

    const fetchStackOutput = new tasks.LambdaInvoke(this, "FetchStackOutput", {
      lambdaFunction: this._fetchStackOutputHandler,
      payload: sfn.TaskInput.fromObject({
        "pk.$": "$.dynamodb.NewImage.PK.S",
        "sk.$": "$.dynamodb.NewImage.SK.S",
      }),
      resultPath: "$.StackOutput",
    });
    fetchStackOutput.addCatch(fallback);

    const storeKnowledgeBaseId = new tasks.LambdaInvoke(
      this,
      "StoreKnowledgeBaseId",
      {
        lambdaFunction: this._StoreKnowledgeBaseIdHandler,
        payload: sfn.TaskInput.fromObject({
          "pk.$": "$.dynamodb.NewImage.PK.S",
          "sk.$": "$.dynamodb.NewImage.SK.S",
          "stack_output.$": "$.StackOutput.Payload",
        }),
        resultPath: sfn.JsonPath.DISCARD,
      }
    );
    storeKnowledgeBaseId.addCatch(fallback);

    const storeGuardrailArn = new tasks.LambdaInvoke(
      this,
      "StoreGuardrailArn",
      {
        lambdaFunction: this._StoreGuardrailArnHandler,
        payload: sfn.TaskInput.fromObject({
          "pk.$": "$.dynamodb.NewImage.PK.S",
          "sk.$": "$.dynamodb.NewImage.SK.S",
          "stack_output.$": "$.StackOutput.Payload",
        }),
        resultPath: sfn.JsonPath.DISCARD,
      }
    );
    storeGuardrailArn.addCatch(fallback);

    const startIngestionJob = new tasks.CallAwsServiceCrossRegion(
      this,
      "StartIngestionJob",
      {
        service: "bedrock-agent",
        action: "startIngestionJob",
        iamAction: "bedrock:StartIngestionJob",
        region: props.bedrockRegion,
        parameters: {
          dataSourceId: sfn.JsonPath.stringAt("$.DataSourceId"),
          knowledgeBaseId: sfn.JsonPath.stringAt("$.KnowledgeBaseId"),
        },
        // Ref: https://docs.aws.amazon.com/ja_jp/service-authorization/latest/reference/list_amazonbedrock.html#amazonbedrock-knowledge-base
        iamResources: [
          `arn:${Stack.of(this).partition}:bedrock:${props.bedrockRegion}:${
            Stack.of(this).account
          }:knowledge-base/*`,
        ],
        resultPath: "$.IngestionJob",
      }
    );

    const getIngestionJob = new tasks.CallAwsServiceCrossRegion(
      this,
      "GetIngestionJob",
      {
        service: "bedrock-agent",
        action: "getIngestionJob",
        iamAction: "bedrock:GetIngestionJob",
        region: props.bedrockRegion,
        parameters: {
          dataSourceId: sfn.JsonPath.stringAt(
            "$.IngestionJob.ingestionJob.dataSourceId"
          ),
          knowledgeBaseId: sfn.JsonPath.stringAt(
            "$.IngestionJob.ingestionJob.knowledgeBaseId"
          ),
          ingestionJobId: sfn.JsonPath.stringAt(
            "$.IngestionJob.ingestionJob.ingestionJobId"
          ),
        },
        // Ref: https://docs.aws.amazon.com/ja_jp/service-authorization/latest/reference/list_amazonbedrock.html#amazonbedrock-knowledge-base
        iamResources: [
          `arn:${Stack.of(this).partition}:bedrock:${props.bedrockRegion}:${
            Stack.of(this).account
          }:knowledge-base/*`,
        ],
        resultPath: "$.IngestionJob",
      }
    );

    const waitTask = new sfn.Wait(this, "WaitSeconds", {
      time: sfn.WaitTime.duration(Duration.seconds(3)),
    });

    const checkIngestionJobStatus = new sfn.Choice(
      this,
      "CheckIngestionJobStatus"
    )
      .when(
        sfn.Condition.stringEquals(
          "$.IngestionJob.ingestionJob.status",
          "COMPLETE"
        ),
        new sfn.Pass(this, "IngestionJobCompleted")
      )
      .when(
        sfn.Condition.stringEquals(
          "$.IngestionJob.ingestionJob.status",
          "FAILED"
        ),
        new tasks.LambdaInvoke(this, "UpdateSyncStatusFailedForIngestion", {
          lambdaFunction: this._updateSyncStatusHandler,
          payload: sfn.TaskInput.fromObject({
            pk: sfn.JsonPath.stringAt("$.PK"),
            sk: sfn.JsonPath.stringAt("$.SK"),
            ingestion_job: sfn.JsonPath.stringAt("$.IngestionJob"),
          }),
          resultPath: sfn.JsonPath.DISCARD,
        }).next(
          new sfn.Fail(this, "IngestionFail", {
            cause: "Ingestion job failed",
            error: "Ingestion job failed",
          })
        )
      )
      .otherwise(waitTask.next(getIngestionJob));

    const mapIngestionJobs = new sfn.Map(this, "MapIngestionJobs", {
      inputPath: "$.StackOutput.Payload.items",
      resultPath: sfn.JsonPath.DISCARD,
      maxConcurrency: 1,
    }).itemProcessor(
      startIngestionJob.next(getIngestionJob).next(checkIngestionJobStatus)
    );

    const definition = extractFirstElement
      .next(updateSyncStatusRunning)
      .next(startCustomBotBuild)
      .next(fetchStackOutput)
      .next(storeKnowledgeBaseId)
      .next(storeGuardrailArn)
      .next(mapIngestionJobs)
      .next(updateSyncStatusSucceeded);

    this._stateMachine = new sfn.StateMachine(this, "StateMachine", {
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
    });
    return this;
  }

  private setupEventBridgePipe(props: EmbeddingProps): this {
    if (!this._stateMachine) {
      throw new Error(
        "State machine must be set up before setting up the EventBridge pipe"
      );
    }

    const pipeLogGroup = new logs.LogGroup(this, "PipeLogGroup", {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK,
    });
    this._pipeRole = new iam.Role(this, "PipeRole", {
      assumedBy: new iam.ServicePrincipal("pipes.amazonaws.com"),
    });
    this._pipeRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:DescribeStream",
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:ListStreams",
        ],
        resources: [props.database.botTable.tableStreamArn!],
      })
    );
    this._pipeRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["states:StartExecution"],
        resources: [this._stateMachine.stateMachineArn],
      })
    );
    this._pipeRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
        resources: [pipeLogGroup.logGroupArn],
      })
    );

    new CfnPipe(this, "Pipe", {
      source: props.database.botTable.tableStreamArn!,
      sourceParameters: {
        dynamoDbStreamParameters: {
          batchSize: 1,
          startingPosition: "LATEST",
          maximumRetryAttempts: 1,
        },
        filterCriteria: {
          filters: [
            {
              pattern:
                '{"dynamodb":{"NewImage":{"SyncStatus":{"S":[{"prefix":"QUEUED"}]}}}}',
            },
          ],
        },
      },
      target: this._stateMachine.stateMachineArn,
      targetParameters: {
        stepFunctionStateMachineParameters: {
          invocationType: "FIRE_AND_FORGET",
        },
      },
      logConfiguration: {
        cloudwatchLogsLogDestination: {
          logGroupArn: pipeLogGroup.logGroupArn,
        },
        level: "INFO",
      },
      roleArn: this._pipeRole.roleArn,
    });

    return this;
  }

  private setupRemovalHandler(props: EmbeddingProps): this {
    const removeHandlerRole = new iam.Role(this, "RemovalHandlerRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    removeHandlerRole.addToPolicy(
      // Assume the table access role for row-level access control.
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [props.database.tableAccessRole.roleArn],
      })
    );
    removeHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResource",
          "cloudformation:DescribeStackResources",
          "cloudformation:DeleteStack",
        ],
        resources: [`*`],
      })
    );
    removeHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "apigateway:GET",
          "apigateway:POST",
          "apigateway:PUT",
          "apigateway:DELETE",
        ],
        resources: [`arn:aws:apigateway:${Stack.of(this).region}::/*`],
      })
    );
    removeHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );
    removeHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:DeleteSecret"],
        resources: [
          `arn:aws:secretsmanager:${Stack.of(this).region}:${
            Stack.of(this).account
          }:secret:firecrawl/*/*`,
        ],
      })
    );
    props.database.botTable.grantStreamRead(removeHandlerRole);
    props.documentBucket.grantReadWrite(removeHandlerRole);

    this._removalHandler = new DockerImageFunction(this, "BotRemovalHandler", {
      code: DockerImageCode.fromImageAsset(
        path.join(__dirname, "../backend"),
        {
          platform: Platform.LINUX_AMD64,
          file: "lambda.Dockerfile",
          cmd: ["app.bot_remove.handler"],
          exclude: [...excludeDockerImage],
        }
      ),
      timeout: Duration.minutes(1),
      environment: {
        ACCOUNT: Stack.of(this).account,
        REGION: Stack.of(this).region,
        BEDROCK_REGION: props.bedrockRegion,
        CONVERSATION_TABLE_NAME: props.database.conversationTable.tableName,
        BOT_TABLE_NAME: props.database.botTable.tableName,
        TABLE_ACCESS_ROLE_ARN: props.database.tableAccessRole.roleArn,
        DOCUMENT_BUCKET: props.documentBucket.bucketName,
      },
      role: removeHandlerRole,
      logRetention: logs.RetentionDays.THREE_MONTHS,
    });
    this._removalHandler.addEventSource(
      new DynamoEventSource(props.database.botTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 1,
        retryAttempts: 2,
        filters: [
          {
            pattern: '{"eventName":["REMOVE"]}',
          },
        ],
      })
    );

    return this;
  }

  private createUpdateSyncStatusTask(
    id: string,
    syncStatus: string,
    syncStatusReason?: string,
    lastExecIdPath?: string
  ): tasks.LambdaInvoke {
    const payload: { [key: string]: any } = {
      "pk.$": "$.dynamodb.NewImage.PK.S",
      "sk.$": "$.dynamodb.NewImage.SK.S",
      sync_status: syncStatus,
      sync_status_reason: syncStatusReason || "",
    };

    if (lastExecIdPath) {
      payload["last_exec_id.$"] = lastExecIdPath;
    }

    return new tasks.LambdaInvoke(this, id, {
      lambdaFunction: this._updateSyncStatusHandler,
      payload: sfn.TaskInput.fromObject(payload),
      resultPath: sfn.JsonPath.DISCARD,
    });
  }
}
