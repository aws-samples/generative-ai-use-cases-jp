import * as lambda from 'aws-cdk-lib/aws-lambda';

export const LAMBDA_RUNTIME_NODEJS = lambda.Runtime.NODEJS_22_X;
export const LAMBDA_RUNTIME_PYTHON = lambda.Runtime.PYTHON_3_13;

// Tenant Management
export const DEFAULT_TENANT_ID = 'default';
