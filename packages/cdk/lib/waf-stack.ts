import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CommonWebAcl } from './construct/common-web-acl';

interface WafStackProps extends StackProps {
  scope: 'REGIONAL' | 'CLOUDFRONT';
  allowedIpV4AddressRanges: string[] | null;
  allowedIpV6AddressRanges: string[] | null;
  allowCountryCodes: string[] | null;
}

export class WafStack extends Stack {
  public readonly webAclArn: CfnOutput;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);

    const webAcl = new CommonWebAcl(this, `WebAcl${id}`, {
      scope: props.scope,
      allowedIpV4AddressRanges: props.allowedIpV4AddressRanges,
      allowedIpV6AddressRanges: props.allowedIpV6AddressRanges,
      allowCountryCodes: props.allowCountryCodes,
    });

    this.webAclArn = new CfnOutput(this, 'WebAclId', {
      value: webAcl.webAclArn,
    });
  }
}
