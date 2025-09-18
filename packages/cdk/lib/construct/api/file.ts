import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';
import { allowS3AccessWithSourceIpCondition } from '../../utils/s3-access-policy';
import { GenericApiProps } from './props';

export type FileApiProps = GenericApiProps;

class FileApi extends Construct {
  readonly getFileDownloadSignedUrlFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: FileApiProps) {
    super(scope, id);

    const {
      api,
      commonAuthorizerProps,
      crossAccountBedrockRoleArn,
      fileBucket,
      assumeRolePolicy,
      tenantManager,
    } = props;

    // API: /file
    const fileRootResource = api.root.addResource('file');

    // DELETE: /file/{fileName}
    const deleteFileFunction = new NodejsFunction(this, 'DeleteFileFunction', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/deleteFile.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props, {
        BUCKET_NAME: fileBucket.bucketName,
      }),
    });
    fileBucket.grantDelete(deleteFileFunction);

    const fileIdResource = fileRootResource.addResource('{fileName}');
    fileIdResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteFileFunction),
      commonAuthorizerProps
    );

    // API: /file/url
    const urlResource = fileRootResource.addResource('url');

    // POST: /file/url
    const getSignedUrlFunction = new NodejsFunction(this, 'GetSignedUrl', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/getFileUploadSignedUrl.ts',
      timeout: Duration.minutes(15),
      bundling: {
        nodeModules: ['aws-jwt-verify'],
      },
      environment: getBaseEnvironment(this, props, {
        BUCKET_NAME: fileBucket.bucketName,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
      }),
    });
    // Grant S3 write permissions with source IP condition
    if (getSignedUrlFunction.role) {
      allowS3AccessWithSourceIpCondition(
        fileBucket.bucketName,
        getSignedUrlFunction.role,
        'write',
        {
          ipv4: props.allowedIpV4AddressRanges,
          ipv6: props.allowedIpV6AddressRanges,
        }
      );
    }

    urlResource.addMethod(
      'POST',
      new LambdaIntegration(getSignedUrlFunction),
      commonAuthorizerProps
    );

    // Get: /file/url
    const getFileDownloadSignedUrlFunction = new NodejsFunction(
      this,
      'GetFileDownloadSignedUrlFunction',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/getFileDownloadSignedUrl.ts',
        timeout: Duration.minutes(15),
        bundling: {
          nodeModules: ['aws-jwt-verify'],
        },
        environment: getBaseEnvironment(this, props, {
          CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
          BUCKET_NAME: fileBucket.bucketName,
          USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        }),
      }
    );
    // Grant S3 read permissions with source IP condition
    if (getFileDownloadSignedUrlFunction.role) {
      allowS3AccessWithSourceIpCondition(
        fileBucket.bucketName,
        getFileDownloadSignedUrlFunction.role,
        'read',
        {
          ipv4: props.allowedIpV4AddressRanges,
          ipv6: props.allowedIpV6AddressRanges,
        }
      );
    }

    urlResource.addMethod(
      'GET',
      new LambdaIntegration(getFileDownloadSignedUrlFunction),
      commonAuthorizerProps
    );

    if (assumeRolePolicy) {
      getFileDownloadSignedUrlFunction.role?.addToPrincipalPolicy(
        assumeRolePolicy
      );
    }
    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(deleteFileFunction);
      tenantManager.tenantsTable.grantReadData(getSignedUrlFunction);
      tenantManager.tenantsTable.grantReadData(
        getFileDownloadSignedUrlFunction
      );
    }

    this.getFileDownloadSignedUrlFunction = getFileDownloadSignedUrlFunction;
  }
}

export default FileApi;
