import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CommonWebAcl } from './construct/common-web-acl';

interface CloudFrontWafStackProps extends StackProps {
  allowedIpV4AddressRanges: string[] | null;
  allowedIpV6AddressRanges: string[] | null;
  allowedCountryCodes: string[] | null;
}

export class CloudFrontWafStack extends Stack {
  public readonly webAclArn: CfnOutput;
  public readonly webAcl: CommonWebAcl;

  constructor(scope: Construct, id: string, props: CloudFrontWafStackProps) {
    super(scope, id, props);

    const webAcl = new CommonWebAcl(this, `WebAcl${id}`, {
      scope: 'CLOUDFRONT',
      allowedIpV4AddressRanges: props.allowedIpV4AddressRanges,
      allowedIpV6AddressRanges: props.allowedIpV6AddressRanges,
      allowedCountryCodes: props.allowedCountryCodes,
    });

    this.webAclArn = new CfnOutput(this, 'WebAclId', {
      value: webAcl.webAclArn,
    });

    this.webAcl = webAcl;
  }
}
