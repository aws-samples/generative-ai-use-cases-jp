import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { UserPool, IUserPool } from 'aws-cdk-lib/aws-cognito';
import {
  IdentityPool,
  IIdentityPool,
} from 'aws-cdk-lib/aws-cognito-identitypool';
import { Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { TenantRole } from '../../construct/tenant-role';

export interface IpAccessControlConfig {
  enabled: boolean;
  allowedIpV4AddressRanges: string[];
  allowedIpV6AddressRanges: string[];
}

export interface TenantIAMStackProps extends cdk.StackProps {
  /**
   * The tenant identifier
   */
  readonly tenantId?: string;

  /**
   * The environment (e.g., dev, staging, prod)
   */
  readonly environment: string;

  /**
   * IP access control configuration
   */
  readonly ipAccessControl?: IpAccessControlConfig;

  /**
   * Description for the stack
   * @default 'IAM role for tenant {tenantId}'
   */
  readonly description?: string;
}

/**
 * Stack for creating tenant-specific IAM roles
 * This stack creates the IAM role needed for Phase 1 AssumeRoleWithWebIdentity authentication
 */
export class TenantIAMStack extends cdk.Stack {
  /**
   * The tenant role construct
   */
  public readonly tenantRole: TenantRole;

  /**
   * The tenant ID
   */
  public readonly tenantId: string;

  constructor(scope: Construct, id: string, props?: TenantIAMStackProps) {
    super(scope, id, props);

    // Get tenant ID from props (required)
    this.tenantId =
      props?.tenantId ||
      (() => {
        throw new Error('tenantId must be provided in stack props');
      })();

    // Get environment (required parameter)
    const environment = props?.environment!;

    // For tenant stacks, use CDK context variables to import from main stack
    // Since main stack and tenant stacks are separate deployments
    const userPoolId = this.node.tryGetContext('userPoolId');
    const identityPoolId = this.node.tryGetContext('identityPoolId');
    const userPoolClientId = this.node.tryGetContext('userPoolClientId');
    const controlPlaneLambdaRoleArn = this.node.tryGetContext(
      'controlPlaneLambdaRoleArn'
    );

    if (!userPoolId) {
      throw new Error(
        'userPoolId must be provided via context (--context userPoolId=<value> or in cdk.tenant.json)'
      );
    }

    if (!identityPoolId) {
      throw new Error(
        'identityPoolId must be provided via context (--context identityPoolId=<value> or in cdk.tenant.json)'
      );
    }

    if (!userPoolClientId) {
      throw new Error(
        'userPoolClientId must be provided via context (--context userPoolClientId=<value> or in cdk.tenant.json)'
      );
    }

    // Get tenant registration API endpoint and key from context
    const registrationApiEndpoint = this.node.tryGetContext(
      'registrationApiEndpoint'
    );
    const registrationApiKey = this.node.tryGetContext('registrationApiKey');
    if (!registrationApiEndpoint) {
      throw new Error(
        'registrationApiEndpoint must be provided via context (--context registrationApiEndpoint=<value> or in cdk.tenant.json)'
      );
    }
    if (!registrationApiKey) {
      throw new Error(
        'registrationApiKey must be provided via context (--context registrationApiKey=<value> or in cdk.tenant.json)'
      );
    }

    // Import existing pools using the context values from main stack
    const userPool = UserPool.fromUserPoolId(
      this,
      'ImportedUserPool',
      userPoolId
    );
    const identityPool = IdentityPool.fromIdentityPoolId(
      this,
      'ImportedIdentityPool',
      identityPoolId
    );

    // Create the tenant role construct
    this.tenantRole = new TenantRole(this, 'TenantRole', {
      tenantId: this.tenantId,
      userPool: userPool,
      identityPool: identityPool,
      userPoolClientId: userPoolClientId,
      region: this.region,
      account: this.account,
      env: environment,
      controlPlaneLambdaRoleArn: controlPlaneLambdaRoleArn,
    });

    // Create a Lambda to call the registration API
    const registerTenantLambda = new NodejsFunction(this, 'RegisterTenant', {
      functionName: `tenant-registration-caller-${this.tenantId}`,
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      code: Code.fromInline(`
        const https = require('https');
        const { URL } = require('url');
        
        // Send response to CloudFormation
        const sendResponse = async (event, status, reason, physicalResourceId, data = {}) => {
          const responseBody = JSON.stringify({
            Status: status,
            Reason: reason,
            PhysicalResourceId: physicalResourceId,
            StackId: event.StackId,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            NoEcho: false,
            Data: data,
          });
          
          console.log('Sending CloudFormation response:', responseBody);
          
          const responseUrl = new URL(event.ResponseURL);
          const options = {
            hostname: responseUrl.hostname,
            port: 443,
            path: responseUrl.pathname + responseUrl.search,
            method: 'PUT',
            headers: {
              'Content-Type': '',
              'Content-Length': responseBody.length,
            },
          };
          
          return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
              console.log('CloudFormation response status:', res.statusCode);
              resolve();
            });
            
            req.on('error', (error) => {
              console.error('Failed to send CloudFormation response:', error);
              reject(error);
            });
            
            req.write(responseBody);
            req.end();
          });
        };
        
        exports.handler = async (event, context) => {
          console.log('Event:', JSON.stringify(event, null, 2));

          const physicalResourceId = event.PhysicalResourceId || 'tenant-registration-${this.tenantId}';
          
          try {
            if (event.RequestType === 'Delete') {
              // For deletion, we don't need to call the API
              await sendResponse(event, 'SUCCESS', 'Delete completed successfully', physicalResourceId);
              return;
            }
            
            if (event.RequestType === 'Update') {
              // For updates, we could re-register or just return success
              await sendResponse(event, 'SUCCESS', 'Update completed successfully', physicalResourceId);
              return;
            }
            
            // Handle Create request
            const endpoint = '${registrationApiEndpoint}';
            const apiKey = '${registrationApiKey}';

            const data = JSON.stringify({
              tenantId: '${this.tenantId}',
              accountId: '${this.account}',
              region: '${this.region}',
              environment: '${environment}',
              roleArn: '${this.tenantRole.role.roleArn}',
              controlPlaneLambdaRoleArn: '${controlPlaneLambdaRoleArn || ''}',
              ${props?.ipAccessControl ? `ipAccessControl: ${JSON.stringify(props.ipAccessControl)},` : ''}
            });
            
            console.log('Calling registration API:', endpoint);
            console.log('Registration data:', data);
            
            const url = new URL(endpoint);
            const options = {
              hostname: url.hostname,
              port: 443,
              path: url.pathname,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'x-api-key': apiKey,
              },
            };
            
            await new Promise((resolve, reject) => {
              const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', async () => {
                  console.log('API Response Status:', res.statusCode);
                  console.log('API Response Body:', body);
                  
                  if (res.statusCode === 200 || res.statusCode === 409) {
                    // 200 = success, 409 = already exists (acceptable)
                    await sendResponse(event, 'SUCCESS', 'Tenant registered successfully', physicalResourceId, { registered: true });
                    resolve();
                  } else {
                    const errorMsg = 'Registration API call failed with status ' + res.statusCode + ': ' + body;
                    await sendResponse(event, 'FAILED', errorMsg, physicalResourceId);
                    reject(new Error(errorMsg));
                  }
                });
              });
              
              req.on('error', async (error) => {
                console.error('Request error:', error);
                await sendResponse(event, 'FAILED', 'Request error: ' + error.message, physicalResourceId);
                reject(error);
              });
              
              req.write(data);
              req.end();
            });
            
          } catch (error) {
            console.error('Lambda execution error:', error);
            await sendResponse(event, 'FAILED', 'Lambda execution error: ' + error.message, physicalResourceId);
            throw error;
          }
        };
      `),
    });

    // Create Custom Resource using the local Lambda
    const tenantRegistrationResource = new cdk.CustomResource(
      this,
      'TenantRegistration',
      {
        serviceToken: registerTenantLambda.functionArn,
        resourceType: 'Custom::TenantRegistration',
      }
    );

    // Ensure registration happens after role creation
    tenantRegistrationResource.node.addDependency(this.tenantRole);

    // Add stack-level outputs with export names
    new cdk.CfnOutput(this, 'StackTenantRoleArn', {
      value: this.tenantRole.role.roleArn,
      description: `ARN of the IAM role for tenant ${this.tenantId}`,
      exportName: `${this.stackName}-TenantRoleArn`,
    });

    new cdk.CfnOutput(this, 'StackTenantRoleName', {
      value: this.tenantRole.role.roleName,
      description: `Name of the IAM role for tenant ${this.tenantId}`,
      exportName: `${this.stackName}-TenantRoleName`,
    });

    new cdk.CfnOutput(this, 'StackTenantId', {
      value: this.tenantId,
      description: `Tenant ID for this IAM role`,
      exportName: `${this.stackName}-TenantId`,
    });

    // Add tags
    cdk.Tags.of(this).add('TenantId', this.tenantId.toString());
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Purpose', 'TenantIAMRole');

    // Set stack description
    this.templateOptions.description =
      props?.description ||
      `Creates tenant-specific IAM role for multi-tenant application (tenant: ${this.tenantId})`;
  }

  /**
   * Get the tenant role construct
   */
  public getTenantRole(): TenantRole {
    return this.tenantRole;
  }

  /**
   * Get the IAM role
   */
  public getRole() {
    return this.tenantRole.role;
  }

  /**
   * Get the role ARN
   */
  public getRoleArn(): string {
    return this.tenantRole.getRoleArn();
  }

  /**
   * Get the role name
   */
  public getRoleName(): string {
    return this.tenantRole.getRoleName();
  }
}
