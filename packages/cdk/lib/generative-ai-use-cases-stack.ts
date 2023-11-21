import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Auth, Api, Web, Database, Rag, Transcribe } from './construct';

interface GenerativeAiUseCasesStackProps extends StackProps {
  webAclId?: string;
}

export class GenerativeAiUseCasesStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: GenerativeAiUseCasesStackProps
  ) {
    super(scope, id, props);

    process.env.overrideWarningsEnabled = 'false';

    const ragEnabled: boolean = this.node.tryGetContext('ragEnabled')!;
    const selfSignUpEnabled: boolean =
      this.node.tryGetContext('selfSignUpEnabled')!;

    if (typeof selfSignUpEnabled !== 'boolean') {
      throw new Error(
        'cdk.json の selfSignUpEnabled には true か false を設定してください。'
      );
    }

    const auth = new Auth(this, 'Auth', {
      selfSignUpEnabled,
    });
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
      ragEnabled,
      selfSignUpEnabled,
      webAclId: props.webAclId,
    });

    if (ragEnabled) {
      new Rag(this, 'Rag', {
        userPool: auth.userPool,
        api: api.api,
      });
    }

    new Transcribe(this, 'Transcribe', {
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

    new CfnOutput(this, 'RagEnabled', {
      value: ragEnabled.toString(),
    });

    new CfnOutput(this, 'SelfSignUpEnabled', {
      value: selfSignUpEnabled.toString(),
    });
  }
}
