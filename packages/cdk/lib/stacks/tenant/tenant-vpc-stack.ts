import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface TenantVpcStackProps extends cdk.StackProps {
  /**
   * The tenant identifier
   */
  readonly tenantId?: string;

  /**
   * The environment (e.g., dev, staging, prod)
   */
  readonly environment: string;

  /**
   * CIDR block for the VPC
   * @default '10.0.0.0/16'
   */
  readonly vpcCidr?: string;

  /**
   * Maximum number of Availability Zones to use
   * @default 2
   */
  readonly maxAzs?: number;

  /**
   * Number of NAT gateways to provision
   * @default 1
   */
  readonly natGateways?: number;

  /**
   * Description for the stack
   * @default 'VPC and networking infrastructure for tenant {tenantId}'
   */
  readonly description?: string;
}

/**
 * Stack that creates VPC and networking infrastructure for a tenant
 * This VPC can be used by multiple resources including OpenSearch, RDS, etc.
 */
export class TenantVpcStack extends cdk.Stack {
  /**
   * The VPC created by this stack
   */
  public readonly vpc: ec2.Vpc;

  /**
   * Private subnets for resources that don't need internet access
   */
  public readonly privateSubnets: ec2.ISubnet[];

  /**
   * Public subnets for resources that need internet access
   */
  public readonly publicSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: TenantVpcStackProps) {
    super(scope, id, props);

    // Create parameter if tenant ID not provided
    const tenantId =
      props.tenantId ||
      new cdk.CfnParameter(this, 'TenantId', {
        description: 'The tenant identifier for the VPC',
        type: 'String',
        allowedPattern: '^[a-zA-Z0-9-]+$',
        constraintDescription:
          'Tenant ID must contain only alphanumeric characters and hyphens',
      }).valueAsString;

    // Get environment (required parameter)
    const environment = props.environment;

    // Create VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, 'TenantVpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr || '10.0.0.0/16'),
      maxAzs: props.maxAzs || 2,
      natGateways: props.natGateways || 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      vpcName: `${environment}-${tenantId}-vpc`,
    });

    // Store subnet references
    this.privateSubnets = this.vpc.privateSubnets;
    this.publicSubnets = this.vpc.publicSubnets;

    // Add VPC Flow Logs for security and monitoring
    this.vpc.addFlowLog('VpcFlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });

    // Export VPC outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: `VPC ID for tenant ${tenantId}`,
      exportName: `${this.stackName}-VpcId`,
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: `VPC CIDR block for tenant ${tenantId}`,
      exportName: `${this.stackName}-VpcCidr`,
    });

    // Export private subnet IDs
    this.privateSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `PrivateSubnet${index + 1}Id`, {
        value: subnet.subnetId,
        description: `Private subnet ${index + 1} ID for tenant ${tenantId}`,
        exportName: `${this.stackName}-PrivateSubnet${index + 1}Id`,
      });
    });

    // Export public subnet IDs
    this.publicSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `PublicSubnet${index + 1}Id`, {
        value: subnet.subnetId,
        description: `Public subnet ${index + 1} ID for tenant ${tenantId}`,
        exportName: `${this.stackName}-PublicSubnet${index + 1}Id`,
      });
    });

    // Export VPC ARN
    new cdk.CfnOutput(this, 'VpcArn', {
      value: this.vpc.vpcArn,
      description: `VPC ARN for tenant ${tenantId}`,
      exportName: `${this.stackName}-VpcArn`,
    });

    // Add tags
    cdk.Tags.of(this).add('TenantId', tenantId.toString());
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Purpose', 'TenantNetworking');

    // Set stack description
    this.templateOptions.description =
      props.description ||
      `Creates VPC and networking infrastructure for multi-tenant application (tenant: ${tenantId})`;
  }

  /**
   * Get the VPC
   */
  public getVpc(): ec2.Vpc {
    return this.vpc;
  }

  /**
   * Get all private subnets
   */
  public getPrivateSubnets(): ec2.ISubnet[] {
    return this.privateSubnets;
  }

  /**
   * Get all public subnets
   */
  public getPublicSubnets(): ec2.ISubnet[] {
    return this.publicSubnets;
  }

  /**
   * Create a security group in this VPC
   */
  public createSecurityGroup(
    id: string,
    props?: ec2.SecurityGroupProps
  ): ec2.SecurityGroup {
    return new ec2.SecurityGroup(this, id, {
      vpc: this.vpc,
      ...props,
    });
  }
}
