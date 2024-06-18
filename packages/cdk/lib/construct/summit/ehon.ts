import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { TaskInput, JsonPath, Parallel, Map, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { BedrockInvokeModel, DynamoPutItem, DynamoAttributeValue, LambdaInvoke, DynamoUpdateItem } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Function, Runtime, Code, Architecture } from 'aws-cdk-lib/aws-lambda';
import { FoundationModel, FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
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
    const model = FoundationModel.fromFoundationModelId(
      this,
      'Model',
      FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0
    );

    const createSummary = new BedrockInvokeModel(this, 'Create Summary', {
      model,
      body: TaskInput.fromObject({
        anthropic_version: "bedrock-2023-05-31",
        messages: [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text.$": "States.Format('{}{}{}', '\n\nHuman: あなたはセンスに溢れた気鋭に溢れる情熱的な作家です。Humanがテーマを与えるので、膨らませて、物語のあらすじを考えてください。\nあらすじは物語を起承転結のシーンごとに分け、情景や描写を詳しく書くようにしてください。\n起の部分では、登場人物の人となりを説明し、読者が主人公たちに親近感を抱くような情景を描写してください。\n承の部分では、主人公は誤ちを犯しますが、途中でそのことに気づき、新たな視点で物事に取り組むようになります。\n転の部分では、承で培った経験をもとに、困難を乗り越えます。\n結の部分では、主人公がテーマを達成した様子を描写します。\n以上のような形であらすじを考案してください。シーンは4個生成してください。\nまた、出来上がったあらすじはjson形式で、plot要素の中で各シーンをリスト形式で出力してください。リストの要素には、インデックス番号を含めないでください。また、json以外の文字列は出力しないでください。\n\n<テーマ>',$.theme,'</テーマ>\n\nAssistant: ')"
              }
            ]
          }],
        max_tokens: 10000,
        temperature: 0,
        top_k: 250,
        top_p: 1,
      }),
      resultSelector: {             
        'theme.$': '$$.Execution.Input.theme',
        'summary.$': '$.Body.content[0].text',
        'id.$': '$$.Execution.Name',
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
