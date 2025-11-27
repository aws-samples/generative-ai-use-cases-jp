import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { CfnDistribution, Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';

export interface MaintenanceModeProps {
  /**
   * The CloudFront distribution to attach maintenance mode functions to
   */
  distribution: Distribution;
  /**
   * Environment suffix to make KeyValueStore name unique (e.g., 'tmp', 'devel', 'produ')
   */
  environmentSuffix: string;
}

/**
 * Construct for implementing maintenance mode functionality using CloudFront Functions and KeyValueStore
 */
export class MaintenanceMode extends Construct {
  /**
   * The ARN of the KeyValueStore
   */
  public readonly kvsArn: string;

  /**
   * The name of the maintenance assets S3 bucket
   */
  public readonly maintenanceBucketName: string;

  /**
   * The KeyValueStore for maintenance mode state
   */
  public readonly keyValueStore: cloudfront.CfnKeyValueStore;

  /**
   * The S3 bucket for maintenance page assets
   */
  public readonly maintenanceBucket: s3.Bucket;

  /**
   * The ViewerRequest CloudFront Function
   */
  public readonly viewerRequestFunction: cloudfront.Function;

  /**
   * The ViewerResponse CloudFront Function
   */
  public readonly viewerResponseFunction: cloudfront.Function;

  constructor(scope: Construct, id: string, props: MaintenanceModeProps) {
    super(scope, id);

    // Task 1.2: Create S3 bucket for maintenance page assets
    this.maintenanceBucket = new s3.Bucket(this, 'MaintenanceBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.maintenanceBucketName = this.maintenanceBucket.bucketName;

    // Task 1.3: Create CloudFront KeyValueStore
    this.keyValueStore = new cloudfront.CfnKeyValueStore(
      this,
      'MaintenanceKVS',
      {
        name: `MaintenanceModeStore${props.environmentSuffix}`,
        comment: 'KeyValueStore for maintenance mode state and IP whitelist',
      }
    );

    this.kvsArn = this.keyValueStore.attrArn;

    // Note: KeyValueStore must be initialized after deployment using the maintenance-mode.sh script
    // The script will automatically initialize the KVS with default values on first run:
    //   maintenance: false (maintenance mode disabled)
    //   ipWhitelist: "" (no IPs whitelisted)

    // Task 2.1 & 2.3: Create ViewerRequest CloudFront Function
    const viewerRequestCode = fs.readFileSync(
      path.join(__dirname, '../../cloudfront-functions/viewer-request.js'),
      'utf-8'
    );

    this.viewerRequestFunction = new cloudfront.Function(
      this,
      'ViewerRequestFunction',
      {
        code: cloudfront.FunctionCode.fromInline(viewerRequestCode),
        comment: 'Maintenance mode ViewerRequest function',
        runtime: cloudfront.FunctionRuntime.JS_2_0,
        keyValueStore: this.keyValueStore,
      }
    );

    // Task 2.2 & 2.3: Create ViewerResponse CloudFront Function
    const viewerResponseCode = fs.readFileSync(
      path.join(__dirname, '../../cloudfront-functions/viewer-response.js'),
      'utf-8'
    );

    this.viewerResponseFunction = new cloudfront.Function(
      this,
      'ViewerResponseFunction',
      {
        code: cloudfront.FunctionCode.fromInline(viewerResponseCode),
        comment: 'Maintenance mode ViewerResponse function',
        runtime: cloudfront.FunctionRuntime.JS_2_0,
        keyValueStore: this.keyValueStore,
      }
    );

    // Task 4.3: Deploy maintenance page assets to S3
    // This will be populated with actual HTML/CSS files in Phase 4
    const maintenanceAssetsPath = path.join(
      __dirname,
      '../../assets/maintenance'
    );

    // Only deploy if the assets directory exists
    if (fs.existsSync(maintenanceAssetsPath)) {
      new s3deploy.BucketDeployment(this, 'DeployMaintenanceAssets', {
        sources: [s3deploy.Source.asset(maintenanceAssetsPath)],
        destinationBucket: this.maintenanceBucket,
        prune: false, // Don't delete existing files
      });
    }

    // Task 1.4 & 3.1: Create OAI and add maintenance bucket as CloudFront origin
    const oai = new cloudfront.OriginAccessIdentity(this, 'MaintenanceOAI', {
      comment: 'OAI for maintenance bucket access',
    });

    // Grant CloudFront OAI read permissions
    this.maintenanceBucket.grantRead(oai);

    // Task 3.2 & 3.3: Attach functions to distribution and configure behaviors
    // Access the L1 construct and modify its properties directly to ensure proper array handling
    const cfnDistribution = props.distribution.node
      .defaultChild as CfnDistribution;

    const maintenanceOriginId = 'MaintenanceS3Origin';

    // Add maintenance bucket as an additional origin using array index
    // First, we need to find the next available index
    // The CloudFrontToS3 construct creates one origin at index 0
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.1', {
      Id: maintenanceOriginId,
      DomainName: this.maintenanceBucket.bucketRegionalDomainName,
      S3OriginConfig: {
        OriginAccessIdentity: `origin-access-identity/cloudfront/${oai.originAccessIdentityId}`,
      },
    });

    // Initialize FunctionAssociations array if it doesn't exist, then append
    cfnDistribution.addPropertyOverride(
      'DistributionConfig.DefaultCacheBehavior.FunctionAssociations',
      [
        {
          EventType: 'viewer-request',
          FunctionARN: this.viewerRequestFunction.functionArn,
        },
        {
          EventType: 'viewer-response',
          FunctionARN: this.viewerResponseFunction.functionArn,
        },
      ]
    );

    // Initialize CacheBehaviors array if it doesn't exist, then add behaviors
    cfnDistribution.addPropertyOverride('DistributionConfig.CacheBehaviors', [
      {
        PathPattern: '/maintenance.html',
        TargetOriginId: maintenanceOriginId,
        ViewerProtocolPolicy: 'redirect-to-https',
        AllowedMethods: ['GET', 'HEAD'],
        CachedMethods: ['GET', 'HEAD'],
        Compress: true,
        CachePolicyId: cloudfront.CachePolicy.CACHING_DISABLED.cachePolicyId,
        FunctionAssociations: [
          {
            EventType: 'viewer-response',
            FunctionARN: this.viewerResponseFunction.functionArn,
          },
        ],
      },
      {
        PathPattern: '/maintenance.css',
        TargetOriginId: maintenanceOriginId,
        ViewerProtocolPolicy: 'redirect-to-https',
        AllowedMethods: ['GET', 'HEAD'],
        CachedMethods: ['GET', 'HEAD'],
        Compress: true,
        CachePolicyId: cloudfront.CachePolicy.CACHING_OPTIMIZED.cachePolicyId,
        FunctionAssociations: [
          {
            EventType: 'viewer-response',
            FunctionARN: this.viewerResponseFunction.functionArn,
          },
        ],
      },
    ]);
  }
}
