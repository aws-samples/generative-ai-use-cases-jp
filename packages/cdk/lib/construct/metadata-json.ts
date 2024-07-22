import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as pipes from 'aws-cdk-lib/aws-pipes';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class StepFunctionsConstruct extends Construct {
    public readonly metadataJsonGenerator: sfn.StateMachine;
    public readonly copyRawObjectAndMetadata: sfn.StateMachine;
  
    constructor(scope: Construct, id: string, props: {
      knowledgeBase: bedrock.CfnKnowledgeBase,
      model: bedrock.FoundationModel;
    }) {
      super(scope, id);
      const {
        knowledgeBase,
        model
      } = props;
  
    // PDF files Bucket
    const rawTextFileBucket = new s3.Bucket(this, 'rawTextFileBucket', {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        autoDeleteObjects: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
        enforceSSL: true,
        eventBridgeEnabled: true,
      });

    // Glue Schema Registry
    const registry = new glue.CfnRegistry(this, 'S3DataSourceSchemaRegistry', {
        name: 'KnowledgeBase',
        description: 'Registry for S3 data source metadata schemas',
      });
      const registryProperty: glue.CfnSchema.RegistryProperty = {
        arn : registry.attrArn
      };
  
      const metadataSchema = new glue.CfnSchema(this, 'MetadataJsonSchema', {
        name: 'metadataJson',
        registry: registryProperty,
        dataFormat: 'JSON',
        compatibility: 'NONE',
        schemaDefinition: JSON.stringify({
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            metadataAttributes: {
              type: "object",
              description: "論文のメタデータ",
              properties: {
                keywords: {
                  type: "string",
                  description: "論文のキーワード"
                }
              }
            }
          },
          required: ["metadataAttributes"]
        })
      });
      metadataSchema.addDependency(registry);

      // Step Functions
      const stepFunctionsRole = new iam.Role(this, 'StepFunctionsRole', {
        assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      });
  
      stepFunctionsRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
      stepFunctionsRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSGlueConsoleFullAccess'));
      stepFunctionsRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'));
  
      const ragApi = new tasks.CallAwsService(this, 'RAG API', {
        service: 'bedrockagentruntime',
        action: 'retrieveAndGenerate',
        parameters: {
          Input: {
            'Text.$': "States.Format('Give me a summary of {} and list the keywords found on the first page in the abstract section.', $.detail.object.key)"
          },
          RetrieveAndGenerateConfiguration: {
            ExternalSourcesConfiguration: {
              ModelArn: model.modelArn,
              Sources: [{
                S3Location: {
                  'Uri.$': "States.Format('s3://{}/{}', $.detail.bucket.name, $.detail.object.key)"
                },
                SourceType: 'S3'
              }]
            },
            Type: 'EXTERNAL_SOURCES'
          }
        },
        iamResources: ['*'],
        resultSelector: {
          Text: sfn.JsonPath.stringAt('$.Output.Text')
          },
        resultPath: '$.RetrieveAndGenerate'
      });
  
      const getSchemaVersion = new tasks.CallAwsService(this, 'Get Schema Version', {
        service: 'glue',
        action: 'getSchemaVersion',
        parameters: {
          SchemaId: {
            RegistryName: registry.name,
            SchemaName: metadataSchema.name
          },
          SchemaVersionNumber: {
            LatestVersion: true
          }
        },
        iamResources: ['*'],
        resultSelector: {
          'SchemaDefinition.$': 'States.StringToJson($.SchemaDefinition)',
          'VersionNumber.$': '$.VersionNumber'
        },
        resultPath: '$.GetSchemaVersion'
      });

      // pass state: wait 10 sec.
      const waitState = new sfn.Wait(this, 'Wait 10 Seconds', {
        time: sfn.WaitTime.duration(cdk.Duration.seconds(10))
      });
  
      // Invoke Claude APIタスクの定義
      const invokeClaudeApi = new tasks.BedrockInvokeModel(this, 'Invoke Claude API', {
        model,
        body: sfn.TaskInput.fromObject({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1000,
          temperature: 0,
          tools: [{
            name: 'print_paper_keywords',
            description: '与えられた論文からキーワードを print out します。',
            'input_schema.$': '$.GetSchemaVersion.SchemaDefinition'
          }],
          tool_choice: {
            type: 'tool',
            name: 'print_paper_keywords'
          },
          messages: [{
            role: 'user',
            content: [{
              type: 'text',
              'text.$': "States.Format('<text>{}</text> print_paper_keywords ツールのみを利用すること。', $.RetrieveAndGenerate.Text)"
            }]
          }]
        }),
        resultSelector: {
            toolUse: {
              'input.$': "$.Body.content[?(@.type=='tool_use')].input"
            }
        },
        resultPath: '$.BedrockInvokeModel'
      });
  
      const uploadToS3 = new tasks.CallAwsService(this, 'Upload to S3', {
        service: 's3',
        action: 'putObject',
        parameters: {
          'Body.$': '$.BedrockInvokeModel.toolUse.input[0]',
          'Bucket.$': '$.detail.bucket.name',
          'Key.$': "States.Format('{}.metadata.json', $.detail.object.key)",
          ContentType: 'application/json'
        },
        iamResources: ['*']
      });
  
      const processSingleItem = ragApi
        .next(getSchemaVersion)
        .next(waitState)
        .next(invokeClaudeApi)
        .next(uploadToS3);
  
      const mapState = new sfn.Map(this, 'Process Items', {
        itemsPath: '$',
        itemSelector: {
          detail: sfn.JsonPath.stringAt('$$.Map.Item.Value.detail')
        },
        maxConcurrency: 1
      });
      mapState.itemProcessor(processSingleItem);
  
      const definition = mapState;
  
      this.metadataJsonGenerator = new sfn.StateMachine(this, 'MetadataGeneratorStateMachine', {
        definition,
        role: stepFunctionsRole,
      });  


      // copyStepFunctionsRole
      const copyStepFunctionsRole = new iam.Role(this, 'CopyStepFunctionsRole', {
        assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      });
      copyStepFunctionsRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
      copyStepFunctionsRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'));
  
      // Step Functions : Bedrock Agents: ListDataSources
      const listDataSources = new tasks.CallAwsService(this, 'ListDataSources', {
        service: 'bedrockagent',
        action: 'listDataSources',
        parameters: {
          KnowledgeBaseId: knowledgeBase.attrKnowledgeBaseId
        },
        iamResources: ['*'],
        resultSelector: {
          ListDataSources: {
            'DataSourceId.$': '$.DataSourceSummaries[0].DataSourceId',
            'KnowledgeBaseId.$': '$.DataSourceSummaries[0].KnowledgeBaseId'
          }
        },
        outputPath: '$.ListDataSources'
      });
      // Step Functions : Bedrock Agents: GetDataSources
      const getDataSource = new tasks.CallAwsService(this, 'GetDataSource', {
        service: 'bedrockagent',
        action: 'getDataSource',
        parameters: {
          'DataSourceId.$': '$.DataSourceId',
          'KnowledgeBaseId.$': '$.KnowledgeBaseId'
        },
        iamResources: ['*'],
        resultSelector: {
          GetDataSource: {
          'BucketArn.$': '$.DataSource.DataSourceConfiguration.S3Configuration.BucketArn',
          'InclusionPrefixes.$': '$.DataSource.DataSourceConfiguration.S3Configuration.InclusionPrefixes'
          }
        },
        outputPath: '$.GetDataSource'
      });
  
      // 並行処理の定義
      const parallelExecution = new sfn.Parallel(this, 'ParallelExecution');
  
      // Step Functions : copy raw PDF to S3DataSource Bucket
      const getObjectKeyFromInput = new sfn.Pass(this, 'GetObjectKeyFromInput', {
        parameters: {
          'RawObjectKey.$': "States.StringSplit($$.Execution.Input.detail.object.key, '.')"
        },
        resultPath: '$.getObjectKeyFromInput'
      });
      const copyRawObject = new tasks.CallAwsService(this, 'CopyRawObject', {
        service: 's3',
        action: 'copyObject',
        parameters: {
          'Bucket.$': "States.ArrayGetItem(States.StringSplit($.BucketArn, ':'), 3)",
          'CopySource.$': "States.Format('{}/{}.{}', $$.Execution.Input.detail.bucket.name, $.getObjectKeyFromInput.RawObjectKey[0], $.getObjectKeyFromInput.RawObjectKey[1])",
          'Key.$': "States.Format('{}/{}.{}', $.InclusionPrefixes[0], $.getObjectKeyFromInput.RawObjectKey[0], $.getObjectKeyFromInput.RawObjectKey[1])"
        },
        iamResources: ['*']
      });
  
      // Step Functions : copy metadata.json to S3DataSource Bucket
      const copyMetadataJson = new tasks.CallAwsService(this, 'CopyMetadataJson', {
        service: 's3',
        action: 'copyObject',
        parameters: {
          'Bucket.$': "States.ArrayGetItem(States.StringSplit($.BucketArn, ':'), 3)",
          'CopySource.$': "States.Format('{}/{}', $$.Execution.Input.detail.bucket.name, $$.Execution.Input.detail.object.key)",
          'Key.$': "States.Format('{}/{}', $.InclusionPrefixes[0], $$.Execution.Input.detail.object.key)",
          ContentType: "application/json"
        },
        iamResources: ['*']
      });
  
      // 並行処理にブランチを追加
      parallelExecution.branch(
        getObjectKeyFromInput.next(copyRawObject),
        copyMetadataJson
      );
  
      // express mode
      this.copyRawObjectAndMetadata = new sfn.StateMachine(this, 'CopyRawObjectAndMetadataStateMachine', {
        definition: listDataSources
          .next(getDataSource)
          .next(parallelExecution),
        role: copyStepFunctionsRole,
        stateMachineType: sfn.StateMachineType.EXPRESS
      });

          // event bridge rule: target SQS
    const SqsQueue = new sqs.Queue(this, 'ObjectCreatedQueue', {
        queueName: 'ObjectCreatedQueue'
      });
      const rule = new events.Rule(this, 'DataSourceCreatedRule', {
        eventPattern: {
          source: ['aws.s3'],
          resources: [rawTextFileBucket.bucketArn],
          detailType: ['Object Created'],
          detail: {
            object: {
              key: [{
                suffix: '.pdf'
              }]
            }
          }
        }
      });
      rule.addTarget(new targets.SqsQueue(SqsQueue));
  
      // event bridge pipes: target metajsonGenerator step functions
      const pipesRole = new iam.Role(this, 'PipesRole', {
        assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com'),
        inlinePolicies: {
          'AllowPutEvents': new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: [this.metadataJsonGenerator.stateMachineArn],
                actions: ['states:StartExecution'],
              }),
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: [SqsQueue.queueArn],
                actions: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'],
              })
            ]
          })
        }
      });
      const Pipes = new pipes.CfnPipe(this, 'Pipes', {
        roleArn: pipesRole.roleArn,
        source: SqsQueue.queueArn,
        target: this.metadataJsonGenerator.stateMachineArn,
        sourceParameters: {
          sqsQueueParameters: {
            batchSize: 10,
            maximumBatchingWindowInSeconds: 3
          }
        },
        targetParameters: {
          stepFunctionStateMachineParameters: {
            invocationType: 'FIRE_AND_FORGET'
          },
          inputTemplate: '{"detail": <$.body.detail>}'
        }
      });
      
      // event bridge rule
      const createdMetadataJsonRule = new events.Rule(this, 'CreatedMetadataJsonRule', {
        eventPattern: {
          source: ['aws.s3'],
          resources: [rawTextFileBucket.bucketArn],
          detailType: ['Object Created'],
          detail: {
            object: {
              key: [{
                suffix: '.metadata.json'
              }]
            }
          }
        }
      });
      createdMetadataJsonRule.addTarget(new targets.SfnStateMachine(this.copyRawObjectAndMetadata));

    }
  }
  