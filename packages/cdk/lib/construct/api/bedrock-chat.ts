import { Construct } from 'constructs';
import { GenericApiProps } from './props';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration, Stack } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

export type BedrockChatApiProps = GenericApiProps;

class BedrockChatApi extends Construct {
  constructor(scope: Construct, id: string, props: BedrockChatApiProps) {
    super(scope, id);

    const { api, commonAuthorizerProps, environment, tenantManager } = props;

    // Create proxy Lambda function for Bedrock Chat
    const bedrockChatProxyFunction = new NodejsFunction(
      this,
      'BedrockChatProxy',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/bedrock-chat-proxy.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(this, props, {
          ENVIRONMENT: environment,
          ...(tenantManager
            ? {
                TENANTS_TABLE_NAME: tenantManager.tenantsTable.tableName,
              }
            : {}),
        }),
      }
    );

    // Grant permissions to invoke tenant Lambda functions
    bedrockChatProxyFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        // TODO: Restrict to specific tenant Lambda functions pattern
        // For now, allow invoking any Lambda in the account that matches the pattern
        resources: [
          `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:*-TenantBedrockChatStack-*`,
        ],
      })
    );

    const bedrockChatResource = api.root.addResource('bedrock-chat');
    const bedrockChatProxyResource =
      bedrockChatResource.addResource('{proxy+}');

    bedrockChatProxyResource.addMethod(
      'ANY',
      new LambdaIntegration(bedrockChatProxyFunction),
      commonAuthorizerProps
    );

    // Also handle direct /bedrock-chat endpoint
    bedrockChatResource.addMethod(
      'ANY',
      new LambdaIntegration(bedrockChatProxyFunction),
      commonAuthorizerProps
    );

    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(bedrockChatProxyFunction);
    }
  }
}

export default BedrockChatApi;
