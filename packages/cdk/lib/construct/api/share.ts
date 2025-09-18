import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';
import { GenericApiProps } from './props';

export type ShareApiProps = GenericApiProps;

class ShareApi extends Construct {
  constructor(scope: Construct, id: string, props: ShareApiProps) {
    super(scope, id);

    const { api, commonAuthorizerProps, table, tenantManager } = props;

    const shareResource = api.root.addResource('shares');
    const shareChatIdResource = shareResource
      .addResource('chat')
      .addResource('{chatId}');

    // GET: /shares/chat/{chatId}
    const findShareId = new NodejsFunction(this, 'FindShareId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/findShareId.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props),
    });

    table.grantReadData(findShareId);

    shareChatIdResource.addMethod(
      'GET',
      new LambdaIntegration(findShareId),
      commonAuthorizerProps
    );

    // POST: /shares/chat/{chatId}
    const createShareId = new NodejsFunction(this, 'CreateShareId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/createShareId.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props),
    });
    table.grantReadWriteData(createShareId);

    shareChatIdResource.addMethod(
      'POST',
      new LambdaIntegration(createShareId),
      commonAuthorizerProps
    );

    const shareShareIdResource = shareResource
      .addResource('share')
      .addResource('{shareId}');

    // GET: /shares/share/{shareId}
    const getSharedChat = new NodejsFunction(this, 'GetSharedChat', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/getSharedChat.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props),
    });
    table.grantReadData(getSharedChat);

    shareShareIdResource.addMethod(
      'GET',
      new LambdaIntegration(getSharedChat),
      commonAuthorizerProps
    );

    // DELETE: /shares/share/{shareId}
    const deleteShareId = new NodejsFunction(this, 'DeleteShareId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/deleteShareId.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props),
    });

    table.grantReadWriteData(deleteShareId);

    shareShareIdResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteShareId),
      commonAuthorizerProps
    );

    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(createShareId);
      tenantManager.tenantsTable.grantReadData(getSharedChat);
      tenantManager.tenantsTable.grantReadData(findShareId);
      tenantManager.tenantsTable.grantReadData(deleteShareId);
    }
  }
}

export default ShareApi;
