import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface FileProps {
  userPool: UserPool;
  api: RestApi;
}

export class File extends Construct {
  readonly fielBucket: Bucket;

  constructor(scope: Construct, id: string, props: FileProps) {
    super(scope, id);

    // ファイルのアップロード機能

    // S3 (File Bucket)
    const fileBucket = new Bucket(this, 'FileBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    fileBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT],
      allowedHeaders: ['*'],
      exposedHeaders: [],
      maxAge: 3000,
    });

    // Lambda
    const getSignedUrlFunction = new NodejsFunction(this, 'GetSignedUrl', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/getMediaUploadSignedUrl.ts',
      timeout: Duration.minutes(15),
      environment: {
        BUCKET_NAME: fileBucket.bucketName,
      },
    });
    fileBucket.grantWrite(getSignedUrlFunction);

    const getFileDownloadSignedUrlFunction = new NodejsFunction(
      this,
      'GetFileDownloadSignedUrlFunction',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/getDocDownloadSignedUrl.ts',
        timeout: Duration.minutes(15),
      }
    );
    fileBucket.grantRead(getFileDownloadSignedUrlFunction);

    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    const fileResource = props.api.root.addResource('file');
    const urlResource = fileResource.addResource('url');

    // POST: /file/url
    urlResource.addMethod(
      'POST',
      new LambdaIntegration(getSignedUrlFunction),
      commonAuthorizerProps
    );

    // Get: /file/url
    urlResource.addMethod(
      'GET',
      new LambdaIntegration(getFileDownloadSignedUrlFunction),
      commonAuthorizerProps
    );

    this.fielBucket = fileBucket;
  }
}
