import {
  RestApi,
  LambdaIntegration,
  CognitoUserPoolsAuthorizer,
  AuthorizationType,
} from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { LAMBDA_RUNTIME_NODEJS } from '../../consts';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';

export interface UseCaseBuilderProps {
  readonly userPool: UserPool;
  readonly api: RestApi;
  readonly vpc?: IVpc;
  readonly securityGroups?: ISecurityGroup[];
  readonly useCaseBuilderEnabled: boolean;
}

export class UseCaseBuilder extends Construct {
  public readonly useCaseBuilderTable: ddb.Table;
  public readonly useCaseIdIndexName: string;

  constructor(scope: Construct, id: string, props: UseCaseBuilderProps) {
    super(scope, id);

    const { userPool, api, useCaseBuilderEnabled } = props;

    // Always create table for backward compatibility and AgentBuilder dependency
    this.useCaseIdIndexName = 'UseCaseIdIndexName';
    this.useCaseBuilderTable = new ddb.Table(this, 'UseCaseBuilderTable', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'dataType',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
    });

    this.useCaseBuilderTable.addGlobalSecondaryIndex({
      indexName: this.useCaseIdIndexName,
      partitionKey: {
        name: 'useCaseId',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'dataType',
        type: ddb.AttributeType.STRING,
      },
      projectionType: ddb.ProjectionType.ALL,
    });

    // Only create Lambda functions and API endpoints if enabled
    if (!useCaseBuilderEnabled) {
      return;
    }

    const commonProperty: NodejsFunctionProps = {
      runtime: LAMBDA_RUNTIME_NODEJS,
      timeout: Duration.minutes(15),
      environment: {
        USECASE_TABLE_NAME: this.useCaseBuilderTable.tableName,
        USECASE_ID_INDEX_NAME: this.useCaseIdIndexName,
      },
      vpc: props.vpc,
      securityGroups: props.securityGroups,
    };

    const commonPath = './lambda/useCaseBuilder';

    // Add UseCaseBuilder related APIs
    const listUseCasesFunction = new NodejsFunction(this, 'ListUseCases', {
      ...commonProperty,
      memorySize: 512,
      entry: `${commonPath}/listUseCases.ts`,
    });
    this.useCaseBuilderTable.grantReadData(listUseCasesFunction);

    const listFavoriteUseCasesFunction = new NodejsFunction(
      this,
      'ListFavoriteUseCases',
      {
        ...commonProperty,
        memorySize: 512,
        entry: `${commonPath}/listFavoriteUseCases.ts`,
        environment: {
          ...commonProperty.environment,
          USECASE_ID_INDEX_NAME: this.useCaseIdIndexName,
        },
      }
    );
    this.useCaseBuilderTable.grantReadData(listFavoriteUseCasesFunction);

    const getUseCaseFunction = new NodejsFunction(this, 'GetUseCase', {
      ...commonProperty,
      memorySize: 512,
      entry: `${commonPath}/getUseCase.ts`,
    });
    this.useCaseBuilderTable.grantReadData(getUseCaseFunction);

    const createUseCaseFunction = new NodejsFunction(this, 'CreateUseCase', {
      ...commonProperty,
      entry: `${commonPath}/createUseCase.ts`,
    });
    this.useCaseBuilderTable.grantWriteData(createUseCaseFunction);

    const updateUseCaseFunction = new NodejsFunction(this, 'UpdateUseCase', {
      ...commonProperty,
      entry: `${commonPath}/updateUseCase.ts`,
    });
    this.useCaseBuilderTable.grantReadWriteData(updateUseCaseFunction);

    const deleteUseCaseFunction = new NodejsFunction(this, 'DeleteUseCase', {
      ...commonProperty,
      entry: `${commonPath}/deleteUseCase.ts`,
    });
    this.useCaseBuilderTable.grantReadWriteData(deleteUseCaseFunction);

    const toggleFavoriteFunction = new NodejsFunction(this, 'ToggleFavorite', {
      ...commonProperty,
      entry: `${commonPath}/toggleFavorite.ts`,
    });
    this.useCaseBuilderTable.grantReadWriteData(toggleFavoriteFunction);

    const toggleSharedFunction = new NodejsFunction(this, 'ToggleShared', {
      ...commonProperty,
      entry: `${commonPath}/toggleShared.ts`,
    });
    this.useCaseBuilderTable.grantReadWriteData(toggleSharedFunction);

    const listRecentlyUsedUseCasesFunction = new NodejsFunction(
      this,
      'ListRecentlyUsedUseCases',
      {
        ...commonProperty,
        memorySize: 512,
        entry: `${commonPath}/listRecentlyUsedUseCases.ts`,
      }
    );
    this.useCaseBuilderTable.grantReadData(listRecentlyUsedUseCasesFunction);

    const updateRecentlyUsedUseCaseFunction = new NodejsFunction(
      this,
      'UpdateRecentlyUsedUseCase',
      {
        ...commonProperty,
        entry: `${commonPath}/updateRecentlyUsedUseCase.ts`,
      }
    );
    this.useCaseBuilderTable.grantReadWriteData(
      updateRecentlyUsedUseCaseFunction
    );

    // API Gateway
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };
    const useCasesResource = api.root.addResource('usecases');

    // GET: /usecases
    useCasesResource.addMethod(
      'GET',
      new LambdaIntegration(listUseCasesFunction),
      commonAuthorizerProps
    );

    // POST: /usecases
    useCasesResource.addMethod(
      'POST',
      new LambdaIntegration(createUseCaseFunction),
      commonAuthorizerProps
    );

    const favoriteUseCaseResource = useCasesResource.addResource('favorite');

    // GET: /usecases/favorite
    favoriteUseCaseResource.addMethod(
      'GET',
      new LambdaIntegration(listFavoriteUseCasesFunction),
      commonAuthorizerProps
    );

    const useCaseResource = useCasesResource.addResource('{useCaseId}');

    // GET: /usecases/{useCaseId}
    useCaseResource.addMethod(
      'GET',
      new LambdaIntegration(getUseCaseFunction),
      commonAuthorizerProps
    );

    // PUT: /usecases/{useCaseId}
    useCaseResource.addMethod(
      'PUT',
      new LambdaIntegration(updateUseCaseFunction),
      commonAuthorizerProps
    );

    // DELETE: /usecases/{useCaseId}
    useCaseResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteUseCaseFunction),
      commonAuthorizerProps
    );

    const favoriteResource = useCaseResource.addResource('favorite');

    // PUT: /usecases/{useCaseId}/favorite
    favoriteResource.addMethod(
      'PUT',
      new LambdaIntegration(toggleFavoriteFunction),
      commonAuthorizerProps
    );

    const sharedResource = useCaseResource.addResource('shared');

    // PUT: /usecases/{useCaseId}/shared
    sharedResource.addMethod(
      'PUT',
      new LambdaIntegration(toggleSharedFunction),
      commonAuthorizerProps
    );

    const recentUseCasesResource = useCasesResource.addResource('recent');

    // GET: /usecases/recent
    recentUseCasesResource.addMethod(
      'GET',
      new LambdaIntegration(listRecentlyUsedUseCasesFunction),
      commonAuthorizerProps
    );

    const recentUseCaseResource =
      recentUseCasesResource.addResource('{useCaseId}');

    // PUT: /usecases/recent/{useCaseId}
    recentUseCaseResource.addMethod(
      'PUT',
      new LambdaIntegration(updateRecentlyUsedUseCaseFunction),
      commonAuthorizerProps
    );
  }
}
