import { Construct } from 'constructs';
import { GenericApiProps } from './props';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration } from 'aws-cdk-lib';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

export type WebTextApiProps = GenericApiProps;

class WebTextApi extends Construct {
  constructor(scope: Construct, id: string, props: WebTextApiProps) {
    super(scope, id);

    const { api, commonAuthorizerProps } = props;

    // Used in the web content extraction use case
    const webTextResource = api.root.addResource('web-text');

    // GET: /web-text

    const getWebTextFunction = new NodejsFunction(this, 'GetWebText', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/getWebText.ts',
      timeout: Duration.minutes(15),
    });

    webTextResource.addMethod(
      'GET',
      new LambdaIntegration(getWebTextFunction),
      commonAuthorizerProps
    );
  }
}

export default WebTextApi;
