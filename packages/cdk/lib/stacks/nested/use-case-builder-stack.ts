import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { IdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';
import { UseCaseBuilder } from '../../construct/use-case-builder';
import { TenantManager } from '../../construct/tenant-manager';

export interface UseCaseBuilderStackProps extends NestedStackProps {
  readonly userPool: UserPool;
  readonly api: RestApi;
  readonly idPool: IdentityPool;
  readonly environment: string;
  readonly tenantManager?: TenantManager;
}

export class UseCaseBuilderStack extends NestedStack {
  constructor(scope: Construct, id: string, props: UseCaseBuilderStackProps) {
    super(scope, id, props);

    new UseCaseBuilder(this, 'UseCaseBuilder', {
      userPool: props.userPool,
      api: props.api,
      idPool: props.idPool,
      environment: props.environment,
      tenantManager: props.tenantManager,
    });
  }
}
