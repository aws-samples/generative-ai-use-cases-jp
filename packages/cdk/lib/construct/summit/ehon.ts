import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { JsonPath, Parallel, Map, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { DynamoPutItem, DynamoAttributeValue, LambdaInvoke, DynamoUpdateItem } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Function, Runtime, Code, Architecture } from 'aws-cdk-lib/aws-lambda';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  AwsIntegration,
  RestApi,
  Cors,
  Model,
} from 'aws-cdk-lib/aws-apigateway';

/**
 * Summit 展示: 絵本生成 のためのリソースを作成する
 */

export interface EhonProps {
  userPool: UserPool;
  api: RestApi;
}

export class Ehon extends Construct {
  readonly ehonStateMachine: StateMachine;
  readonly ehonAPI: RestApi;
  constructor(scope: Construct, id: string, props: EhonProps) {
    super(scope, id);

    // s3
    const s3Bucket = new Bucket(this, 'EhonImageBucket', {
      versioned: true
    });   
    
    // DynamoDB
    const ddbTable = new Table(this, 'EhonTable', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // Lambda
    const ehonLambdaRole = new Role(this, "EhonCommonLambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaRole'),
      ]
    });

    s3Bucket.grantReadWrite(ehonLambdaRole);
    
    ddbTable.grantReadData(ehonLambdaRole);
    
    ehonLambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaRole'));
    
    ehonLambdaRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      })
    );
    
    ehonLambdaRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["polly:SynthesizeSpeech"],
        resources: ["*"],
      })
    );

    const createSummaryFunction = new Function(this, 'CreateSummaryFunction', {
      runtime: Runtime.PYTHON_3_12,
      handler: 'summit/ehon/create_summary.lambda_handler',
      code: Code.fromAsset('lambda'),
      architecture: Architecture.X86_64,
      role: ehonLambdaRole,
      timeout: Duration.minutes(15),
      memorySize: 1000,
    });

    const createSceneFunction = new Function(this, 'CreateSceneFunction', {
      runtime: Runtime.PYTHON_3_12,
      handler: 'summit/ehon/create_scene.lambda_handler',
      code: Code.fromAsset('lambda'),
      architecture: Architecture.X86_64,
      role: ehonLambdaRole,
      timeout: Duration.minutes(15),
      memorySize: 1000,
    });

    const createImageFunction = new Function(this, 'CreateImageFunction', {
      runtime: Runtime.PYTHON_3_12,
      handler: 'summit/ehon/create_image.lambda_handler',
      code: Code.fromAsset('lambda'),
      architecture: Architecture.X86_64,
      role: ehonLambdaRole,
      timeout: Duration.minutes(15),
      memorySize: 1000,
      environment: {
        BUCKET_NAME: s3Bucket.bucketName,
        TABLE_NAME: ddbTable.tableName,
      }
    });

    const createAudioFunction = new Function(this, 'CreateAudioFunction', {
      runtime: Runtime.PYTHON_3_12,
      handler: 'summit/ehon/create_audio.lambda_handler',
      code: Code.fromAsset('lambda'),
      architecture: Architecture.X86_64,
      role: ehonLambdaRole,
      timeout: Duration.minutes(15),
      memorySize: 1000,
      environment: {
        BUCKET_NAME: s3Bucket.bucketName
      },      
    });    

    const checkSummaryFunction = new Function(this, 'CheckSummaryFunction', {
      runtime: Runtime.PYTHON_3_12,
      handler: 'summit/ehon/check_summary.lambda_handler',
      code: Code.fromAsset('lambda'),
      architecture: Architecture.X86_64,
      role: ehonLambdaRole,
      timeout: Duration.minutes(15),
      memorySize: 1000,
      environment: {
        TABLE_NAME: ddbTable.tableName,
      },      
    });    

    const checkScenesImageFunction = new Function(this, 'CheckScenesImageFunction', {
      runtime: Runtime.PYTHON_3_12,
      handler: 'summit/ehon/check_scenes_image.lambda_handler',
      code: Code.fromAsset('lambda'),
      architecture: Architecture.X86_64,
      role: ehonLambdaRole,
      timeout: Duration.minutes(15),
      memorySize: 1000,
      environment: {
        BUCKET_NAME: s3Bucket.bucketName
      },      
    });        

    const checkScenesAudioFunction = new Function(this, 'CheckScenesAudioFunction', {
      runtime: Runtime.PYTHON_3_12,
      handler: 'summit/ehon/check_scenes_audio.lambda_handler',
      code: Code.fromAsset('lambda'),
      architecture: Architecture.X86_64,
      role: ehonLambdaRole,
      timeout: Duration.minutes(15),
      memorySize: 1000,
      environment: {
        BUCKET_NAME: s3Bucket.bucketName
      },      
    });  

    const checkScenesTextFunction = new Function(this, 'CheckScenesTextFunction', {
      runtime: Runtime.PYTHON_3_12,
      handler: 'summit/ehon/check_scenes_text.lambda_handler',
      code: Code.fromAsset('lambda'),
      architecture: Architecture.X86_64,
      role: ehonLambdaRole,
      timeout: Duration.minutes(15),
      memorySize: 1000,
      environment: {
        TABLE_NAME: ddbTable.tableName,
      },      
    });  

    // Step Functions
    const createSummary = new LambdaInvoke(this, 'Create Summary', {
      lambdaFunction: createSummaryFunction,
      resultSelector: {
        "theme.$": "$$.Execution.Input.theme",
        "summary.$": "$.Payload",
        "id.$": "$$.Execution.Name"
      },
    });

    const saveSummary = new DynamoPutItem(this, 'Save Summary', {
      item: {
        id: DynamoAttributeValue.fromString(JsonPath.stringAt('$.id')),
        summary: DynamoAttributeValue.fromString(JsonPath.stringAt('$.summary')),
      },
      table: ddbTable,
      resultPath: JsonPath.DISCARD,
    });

    const createScene = new LambdaInvoke(this, 'Create Scene', {
      lambdaFunction: createSceneFunction,
      payloadResponseOnly: true,
      resultPath: '$.scenes',
    });

    const saveScene = new DynamoUpdateItem(this, 'Save Scene', {
      table: ddbTable,
      key: {
        id: DynamoAttributeValue.fromString(JsonPath.stringAt('$.id')),
      },
      updateExpression: 'SET scenes = :scenesRef, scenes_count = :scenesCountRef',
      expressionAttributeValues: {
        ':scenesRef': DynamoAttributeValue.listFromJsonPath(JsonPath.stringAt('$.scenes.scenes')),
        ':scenesCountRef': DynamoAttributeValue.numberFromString(JsonPath.stringAt('$.scenes.scenes_count')),
      },
      resultPath: JsonPath.DISCARD,
    });

    const createImage = new LambdaInvoke(this, 'Create Image', {
      lambdaFunction: createImageFunction,
      payloadResponseOnly: true,
    });

    const createAudio = new LambdaInvoke(this, 'Create Audio', {
      lambdaFunction: createAudioFunction,
      payloadResponseOnly: true,
    });

    const createImageAndAudio = new Parallel(this, 'Create Image And Audio', {
      resultPath: JsonPath.DISCARD,
    });

    createImageAndAudio.branch(
      new Map(this, 'Create Image Map', {
        itemsPath: JsonPath.stringAt('$.scenes.scenes'),
        parameters: {
          'scene.$': '$$.Map.Item.Value',
          'index.$': '$$.Map.Item.Index',
          'id.$': '$$.Execution.Name',
        },
        maxConcurrency: 10,
      }).iterator(createImage)
    );

    createImageAndAudio.branch(createAudio);

    const definition = createSummary
      .next(saveSummary)
      .next(createScene)
      .next(saveScene)
      .next(createImageAndAudio);

    const ehonStateMachine = new StateMachine(this, 'EhonStateMachine', {
      definition,
    })

    this.ehonStateMachine = ehonStateMachine;

    // API Gateway
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    const ehonAPI = new RestApi(this, 'EhonAPI', {
      restApiName: 'EhonAPI',
      deployOptions: {
        stageName: 'dev',
      },
    });

    this.ehonAPI = ehonAPI;

    const stepFunctionsRoleForAPIGW = new Role(this, 'StepFunctionsRoleForAPIGW', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    
    stepFunctionsRoleForAPIGW.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['states:StartExecution'],
        resources: [ehonStateMachine.stateMachineArn],
      })
    );

    const postIntegration = new AwsIntegration({
      service: 'states',
      action: 'StartExecution',
      options: {
        credentialsRole: stepFunctionsRoleForAPIGW,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      },
    });

    ehonAPI.root.addResource('create_ehon').addMethod(
      'POST',
      postIntegration,
      {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': Model.EMPTY_MODEL,
            },
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      },
    );

    const scenesAudioResource = ehonAPI.root.addResource('check_scenes_audio');
    scenesAudioResource.addMethod('GET', new LambdaIntegration(checkScenesAudioFunction), commonAuthorizerProps);

    const scenesImageResource = ehonAPI.root.addResource('check_scenes_image');
    scenesImageResource.addMethod('GET', new LambdaIntegration(checkScenesImageFunction), commonAuthorizerProps);

    const scenesTextResource = ehonAPI.root.addResource('check_scenes_text');
    scenesTextResource.addMethod('GET', new LambdaIntegration(checkScenesTextFunction), commonAuthorizerProps);

    const summaryResource = ehonAPI.root.addResource('check_summary');
    summaryResource.addMethod('GET', new LambdaIntegration(checkSummaryFunction), commonAuthorizerProps);

    ehonAPI.root.resourceForPath('create_ehon').addCorsPreflight({
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: Cors.ALL_METHODS,
    });

    ehonAPI.root.resourceForPath('check_scenes_audio').addCorsPreflight({
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: Cors.ALL_METHODS,
    });

    ehonAPI.root.resourceForPath('check_scenes_image').addCorsPreflight({
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: Cors.ALL_METHODS,
    });
    
    ehonAPI.root.resourceForPath('check_scenes_text').addCorsPreflight({
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: Cors.ALL_METHODS,
    });
    
    ehonAPI.root.resourceForPath('check_summary').addCorsPreflight({
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: Cors.ALL_METHODS,
    });    
  }
}
