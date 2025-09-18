import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';
import { GenericApiProps } from './props';

export type SystemContextApiProps = GenericApiProps;

class SystemContextApi extends Construct {
  constructor(scope: Construct, id: string, props: SystemContextApiProps) {
    super(scope, id);

    const { api, commonAuthorizerProps, table, tenantManager } = props;

    const listSystemContextsFunction = new NodejsFunction(
      this,
      'ListSystemContexts',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/listSystemContexts.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(this, props),
      }
    );
    table.grantReadData(listSystemContextsFunction);

    const createSystemContextFunction = new NodejsFunction(
      this,
      'CreateSystemContexts',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/createSystemContext.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(this, props),
      }
    );
    table.grantWriteData(createSystemContextFunction);

    const updateSystemContextTitleFunction = new NodejsFunction(
      this,
      'UpdateSystemContextTitle',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/updateSystemContextTitle.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(this, props),
      }
    );
    table.grantReadWriteData(updateSystemContextTitleFunction);

    const deleteSystemContextFunction = new NodejsFunction(
      this,
      'DeleteSystemContexts',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/deleteSystemContext.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(this, props),
      }
    );
    table.grantReadWriteData(deleteSystemContextFunction);

    const systemContextsResource = api.root.addResource('systemcontexts');

    // POST: /systemcontexts
    systemContextsResource.addMethod(
      'POST',
      new LambdaIntegration(createSystemContextFunction),
      commonAuthorizerProps
    );

    // GET: /systemcontexts
    systemContextsResource.addMethod(
      'GET',
      new LambdaIntegration(listSystemContextsFunction),
      commonAuthorizerProps
    );

    const systemContextResource =
      systemContextsResource.addResource('{systemContextId}');

    // DELETE: /systemcontexts/{systemContextId}
    systemContextResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteSystemContextFunction),
      commonAuthorizerProps
    );

    const systemContextTitleResource =
      systemContextResource.addResource('title');

    // PUT: /systemcontexts/{systemContextId}/title
    systemContextTitleResource.addMethod(
      'PUT',
      new LambdaIntegration(updateSystemContextTitleFunction),
      commonAuthorizerProps
    );

    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(listSystemContextsFunction);
      tenantManager.tenantsTable.grantReadData(createSystemContextFunction);
      tenantManager.tenantsTable.grantReadData(
        updateSystemContextTitleFunction
      );
      tenantManager.tenantsTable.grantReadData(deleteSystemContextFunction);
    }
  }
}

export default SystemContextApi;
