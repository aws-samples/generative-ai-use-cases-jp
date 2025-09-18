import { Construct } from 'constructs';
import { GenericApiProps } from './props';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { STATS_TABLE_PREFIX } from './const';
import { getBaseEnvironment } from './util';

export type TokenUsageApiProps = GenericApiProps;

class TokenUsageApi extends Construct {
  constructor(scope: Construct, id: string, props: TokenUsageApiProps) {
    super(scope, id);

    const { table, statsTable, api, commonAuthorizerProps, tenantManager } =
      props;

    // GET: /token-usage
    const tokenUsageResource = api.root.addResource('token-usage');

    // Lambda function for getting token usage
    const getTokenUsageFunction = new NodejsFunction(this, 'GetTokenUsage', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/getTokenUsage.ts',
      environment: getBaseEnvironment(this, props, {
        STATS_TABLE_NAME: STATS_TABLE_PREFIX,
        DEFAULT_STATS_TABLE_NAME: statsTable.tableName,
      }),
    });
    table.grantReadData(getTokenUsageFunction);
    statsTable.grantReadData(getTokenUsageFunction);

    tokenUsageResource.addMethod(
      'GET',
      new LambdaIntegration(getTokenUsageFunction),
      commonAuthorizerProps
    );

    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(getTokenUsageFunction);
    }
  }
}

export default TokenUsageApi;
