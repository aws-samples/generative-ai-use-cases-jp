import * as cdk from 'aws-cdk-lib';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface TenantOpenSearchStackProps extends cdk.StackProps {
  /**
   * The tenant identifier
   */
  readonly tenantId?: string;

  /**
   * The environment (e.g., dev, staging, prod)
   */
  readonly environment: string;

  /**
   * The VPC to deploy the OpenSearch domain into
   */
  readonly vpc: ec2.IVpc;

  /**
   * The subnets to deploy the OpenSearch domain into
   */
  readonly subnets: ec2.ISubnet[];

  /**
   * Capacity configuration for the OpenSearch domain
   */
  readonly capacity: opensearch.CapacityConfig;

  /**
   * EBS volume size per data node (in GiB)
   */
  readonly ebsVolumeSize: number;

  /**
   * EBS volume type
   */
  readonly ebsVolumeType: ec2.EbsDeviceVolumeType;

  /**
   * Number of availability zones for zone awareness
   */
  readonly availabilityZoneCount: number;

  /**
   * Hour at which automated snapshots are taken
   */
  readonly automatedSnapshotStartHour: number;

  /**
   * Removal policy for the domain
   */
  readonly removalPolicy: cdk.RemovalPolicy;

  /**
   * The tenant IAM role ARN for accessing OpenSearch
   * This role is assumed by Lambda functions to access tenant-specific resources
   */
  readonly tenantRoleArn: string;

  /**
   * Control plane region for DynamoDB access
   */
  readonly controlPlaneRegion?: string;

  /**
   * OpenSearch index name (defaults to 'assistant-docs')
   */
  readonly openSearchIndexName?: string;
}

/**
 * Stack that creates a managed OpenSearch domain for a tenant
 */
export class TenantOpenSearchStack extends cdk.Stack {
  /**
   * The OpenSearch domain created by this stack
   */
  public readonly domain: opensearch.Domain;

  /**
   * The security group for the OpenSearch domain
   */
  public readonly securityGroup: ec2.SecurityGroup;

  /**
   * The domain endpoint
   */
  public readonly domainEndpoint: string;

  /**
   * The domain ARN
   */
  public readonly domainArn: string;

  /**
   * IAM role for CodeBuild to create OpenSearch indices
   */
  private opensearchIndexCreationRole: iam.Role;

  constructor(scope: Construct, id: string, props: TenantOpenSearchStackProps) {
    super(scope, id, props);

    // Create parameter if tenant ID not provided
    const tenantId =
      props.tenantId ||
      new cdk.CfnParameter(this, 'TenantId', {
        description: 'The tenant identifier for the OpenSearch domain',
        type: 'String',
        allowedPattern: '^[a-zA-Z0-9-]+$',
        constraintDescription:
          'Tenant ID must contain only alphanumeric characters and hyphens',
      }).valueAsString;

    // Get environment (required parameter)
    const environment = props.environment;

    // Validate instance types (exclude EBS-incompatible and ultrawarm types for regular nodes)
    const invalidInstanceTypes = ['i3', 'i3en', 'ultrawarm1'];
    const validateInstanceType = (
      instanceType: string | undefined,
      nodeType: string
    ) => {
      if (!instanceType) return;
      const prefix = instanceType.split('.')[0];
      if (invalidInstanceTypes.includes(prefix)) {
        throw new Error(
          `Invalid ${nodeType} instance type: ${instanceType}. Cannot use ${prefix} instance types.`
        );
      }
    };

    validateInstanceType(props.capacity.dataNodeInstanceType, 'data node');
    validateInstanceType(props.capacity.masterNodeInstanceType, 'master node');

    // Create security group for OpenSearch
    this.securityGroup = new ec2.SecurityGroup(
      this,
      'OpenSearchSecurityGroup',
      {
        vpc: props.vpc,
        description: `Security group for OpenSearch domain ${tenantId}`,
        securityGroupName: `${environment}-${tenantId}-opensearch-sg`,
      }
    );

    // Allow HTTPS traffic from within the VPC
    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      'Allow HTTPS from VPC'
    );

    // Validate subnet count against availability zone count
    if (props.subnets.length < props.availabilityZoneCount) {
      throw new Error(
        `Number of subnets (${props.subnets.length}) must be at least equal to availability zone count (${props.availabilityZoneCount})`
      );
    }

    // Select subnets based on availability zone count
    const selectedSubnets = props.subnets.slice(0, props.availabilityZoneCount);

    // Create OpenSearch domain
    this.domain = new opensearch.Domain(this, 'OpenSearchDomain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_19,
      domainName: `${environment}-${tenantId}-opensearch`,
      capacity: {
        ...props.capacity,
        multiAzWithStandbyEnabled: false,
      },
      ebs: {
        enabled: true,
        volumeSize: props.ebsVolumeSize,
        volumeType: props.ebsVolumeType,
      },
      vpcSubnets: [{ subnets: selectedSubnets }],
      zoneAwareness: {
        enabled: props.availabilityZoneCount > 1,
        availabilityZoneCount:
          props.availabilityZoneCount > 1
            ? props.availabilityZoneCount
            : undefined,
      },
      encryptionAtRest: {
        enabled: true,
      },
      nodeToNodeEncryption: true,
      automatedSnapshotStartHour: props.automatedSnapshotStartHour,
      removalPolicy: props.removalPolicy,
      logging: {
        slowSearchLogEnabled: true,
        appLogEnabled: true,
        slowIndexLogEnabled: true,
      },
    });

    // Store domain endpoint and ARN
    this.domainEndpoint = this.domain.domainEndpoint;
    this.domainArn = this.domain.domainArn;

    // Create IAM role for CodeBuild to access OpenSearch for index creation
    this.opensearchIndexCreationRole = new iam.Role(
      this,
      'OpenSearchIndexCreationRole',
      {
        roleName: `${environment}-${tenantId}-opensearch-index-creator`,
        assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
        description: `Role for CodeBuild to create OpenSearch indices for tenant ${tenantId}`,
      }
    );

    // Grant CodeBuild role permissions to create and manage indices
    this.opensearchIndexCreationRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'es:ESHttpPost',
          'es:ESHttpPut',
          'es:ESHttpDelete',
          'es:ESHttpGet',
          'es:ESHttpHead',
        ],
        resources: [`${this.domain.domainArn}/*`],
      })
    );

    // Grant access to the domain from CodeBuild role, Tenant role, and Bedrock service
    // Note: Tenant role is used by Lambda functions to access OpenSearch for assistant RAG functionality
    const accessPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [
        this.opensearchIndexCreationRole,
        new iam.ArnPrincipal(props.tenantRoleArn), // Add tenant role for Lambda access
        new iam.ServicePrincipal('bedrock.amazonaws.com'),
      ],
      actions: [
        'es:ESHttpPost',
        'es:ESHttpPut',
        'es:ESHttpDelete',
        'es:ESHttpGet',
        'es:ESHttpHead',
      ],
      resources: [`${this.domain.domainArn}/*`],
    });

    this.domain.addAccessPolicies(accessPolicy);

    // Add DescribeDomain permission for Bedrock Knowledge Base validation
    const describeDomainPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('bedrock.amazonaws.com')],
      actions: ['es:DescribeDomain'],
      resources: [this.domain.domainArn],
    });

    this.domain.addAccessPolicies(describeDomainPolicy);

    // Export domain outputs
    new cdk.CfnOutput(this, 'DomainEndpoint', {
      value: this.domainEndpoint,
      description: `OpenSearch domain endpoint for tenant ${tenantId}`,
      exportName: `${this.stackName}-DomainEndpoint`,
    });

    new cdk.CfnOutput(this, 'DomainArn', {
      value: this.domainArn,
      description: `OpenSearch domain ARN for tenant ${tenantId}`,
      exportName: `${this.stackName}-DomainArn`,
    });

    new cdk.CfnOutput(this, 'DomainName', {
      value: this.domain.domainName,
      description: `OpenSearch domain name for tenant ${tenantId}`,
      exportName: `${this.stackName}-DomainName`,
    });

    new cdk.CfnOutput(this, 'SecurityGroupId', {
      value: this.securityGroup.securityGroupId,
      description: `Security group ID for OpenSearch domain ${tenantId}`,
      exportName: `${this.stackName}-SecurityGroupId`,
    });

    new cdk.CfnOutput(this, 'OpenSearchIndexCreationRoleArn', {
      value: this.opensearchIndexCreationRole.roleArn,
      description: `IAM role ARN for CodeBuild to create OpenSearch indices for tenant ${tenantId}`,
      exportName: `${this.stackName}-IndexCreationRoleArn`,
    });

    // Add tags
    cdk.Tags.of(this).add('TenantId', tenantId.toString());
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Purpose', 'TenantOpenSearch');

    // Set stack description
    this.templateOptions.description = `Creates managed OpenSearch domain for multi-tenant application (tenant: ${tenantId})`;
  }

  /**
   * Get the OpenSearch domain
   */
  public getDomain(): opensearch.Domain {
    return this.domain;
  }

  /**
   * Get the security group
   */
  public getSecurityGroup(): ec2.SecurityGroup {
    return this.securityGroup;
  }

  /**
   * Grant read permissions to a principal
   */
  public grantRead(grantee: iam.IGrantable): iam.Grant {
    return this.domain.grantRead(grantee);
  }

  /**
   * Grant write permissions to a principal
   */
  public grantWrite(grantee: iam.IGrantable): iam.Grant {
    return this.domain.grantWrite(grantee);
  }

  /**
   * Grant read/write permissions to a principal
   */
  public grantReadWrite(grantee: iam.IGrantable): iam.Grant {
    return this.domain.grantReadWrite(grantee);
  }

  /**
   * Grant index permissions to a principal
   */
  public grantIndexRead(indexName: string, grantee: iam.IGrantable): iam.Grant {
    return this.domain.grantIndexRead(indexName, grantee);
  }

  /**
   * Grant index write permissions to a principal
   */
  public grantIndexWrite(
    indexName: string,
    grantee: iam.IGrantable
  ): iam.Grant {
    return this.domain.grantIndexWrite(indexName, grantee);
  }

  /**
   * Grant index read/write permissions to a principal
   */
  public grantIndexReadWrite(
    indexName: string,
    grantee: iam.IGrantable
  ): iam.Grant {
    return this.domain.grantIndexReadWrite(indexName, grantee);
  }
}
