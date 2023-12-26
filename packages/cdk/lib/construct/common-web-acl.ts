import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { CfnIPSet, CfnWebACL, CfnWebACLProps } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

interface WafStackProps extends StackProps {
  allowedIpV4AddressRanges: string[] | null;
  allowedIpV6AddressRanges: string[] | null;
}

export class WafStack extends Stack {
  public readonly webAclArn: CfnOutput;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);

    const rules: CfnWebACLProps['rules'] = [];

    if (props.allowedIpV4AddressRanges) {
      const ipV4SetReferenceStatement = new CfnIPSet(this, 'IpV4Set', {
        ipAddressVersion: 'IPV4',
        scope: 'CLOUDFRONT',
        addresses: props.allowedIpV4AddressRanges,
      });
      rules.push({
        priority: 0,
        name: 'IpV4RuleSet',
        action: { allow: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'FrontendWebAcl',
          sampledRequestsEnabled: true,
        },
        statement: {
          ipSetReferenceStatement: {
            arn: ipV4SetReferenceStatement.attrArn,
          },
        },
      });
    }
    if (props.allowedIpV6AddressRanges) {
      const ipV6SetReferenceStatement = new CfnIPSet(this, 'IpV6Set', {
        ipAddressVersion: 'IPV6',
        scope: 'CLOUDFRONT',
        addresses: props.allowedIpV6AddressRanges,
      });
      rules.push({
        priority: 1,
        name: 'IpV6RuleSet',
        action: { allow: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'FrontendWebAcl',
          sampledRequestsEnabled: true,
        },
        statement: {
          ipSetReferenceStatement: {
            arn: ipV6SetReferenceStatement.attrArn,
          },
        },
      });
    }

    const webAcl = new CfnWebACL(this, 'WebAcl', {
      defaultAction: { block: {} },
      name: 'FrontendWebAcl',
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'FrontendWebAcl',
        sampledRequestsEnabled: true,
      },
      rules,
    });

    this.webAclArn = new CfnOutput(this, 'WebAclId', {
      value: webAcl.attrArn,
    });
  }
}
