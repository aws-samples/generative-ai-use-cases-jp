import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Auth, Api, Web, Database } from './construct';
import { Rag } from './construct/rag';

export class GenerativeAiUseCasesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    process.env.overrideWarningsEnabled = 'false';

    const auth = new Auth(this, 'Auth');
    const database = new Database(this, 'Database');
    const api = new Api(this, 'API', {
      userPool: auth.userPool,
      idPool: auth.idPool,
      table: database.table,
    });

    const web = new Web(this, 'Api', {
      apiEndpointUrl: api.api.url,
      userPoolId: auth.userPool.userPoolId,
      userPoolClientId: auth.client.userPoolClientId,
      idPoolId: auth.idPool.identityPoolId,
      predictStreamFunctionArn: api.predictStreamFunction.functionArn,
    });

    new Rag(this, 'Rag', {
      userPool: auth.userPool,
      api: api.api,
    });

    new CfnOutput(this, 'Region', {
      value: this.region,
    });

    new CfnOutput(this, 'WebUrl', {
      value: `https://${web.distribution.domainName}`,
    });

    new CfnOutput(this, 'ApiEndpoint', {
      value: api.api.url,
    });

    new CfnOutput(this, 'UserPoolId', { value: auth.userPool.userPoolId });

    new CfnOutput(this, 'UserPoolClientId', {
      value: auth.client.userPoolClientId,
    });

    new CfnOutput(this, 'IdPoolId', { value: auth.idPool.identityPoolId });

    new CfnOutput(this, 'PredictStreamFunctionArn', {
      value: api.predictStreamFunction.functionArn,
    });
  }
}
