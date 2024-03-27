import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import {
  Certificate,
  CertificateValidation,
  ICertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { CommonWebAcl } from './construct/common-web-acl';

interface CloudFrontWafStackProps extends StackProps {
  allowedIpV4AddressRanges: string[] | null;
  allowedIpV6AddressRanges: string[] | null;
  allowedCountryCodes: string[] | null;
  hostName?: string;
  zoneName?: string;
  hostedZoneId?: string;
}

export class CloudFrontWafStack extends Stack {
  public readonly webAclArn: string;
  public readonly webAcl: CommonWebAcl;
  public readonly cert: ICertificate;

  constructor(scope: Construct, id: string, props: CloudFrontWafStackProps) {
    super(scope, id, props);

    if (
      props.allowedIpV4AddressRanges ||
      props.allowedIpV6AddressRanges ||
      props.allowedCountryCodes
    ) {
      const webAcl = new CommonWebAcl(this, `WebAcl${id}`, {
        scope: 'CLOUDFRONT',
        allowedIpV4AddressRanges: props.allowedIpV4AddressRanges,
        allowedIpV6AddressRanges: props.allowedIpV6AddressRanges,
        allowedCountryCodes: props.allowedCountryCodes,
      });

      new CfnOutput(this, 'WebAclId', {
        value: webAcl.webAclArn,
      });
      this.webAclArn = webAcl.webAclArn;
      this.webAcl = webAcl;
    }

    if (props.hostName && props.zoneName && props.hostedZoneId) {
      const hostedZone = HostedZone.fromHostedZoneAttributes(
        this,
        'HostedZone',
        {
          hostedZoneId: props.hostedZoneId,
          zoneName: props.zoneName,
        }
      );
      const cert = new Certificate(this, 'Cert', {
        domainName: `${props.hostName}.${props.zoneName}`,
        validation: CertificateValidation.fromDns(hostedZone),
      });
      this.cert = cert;
    }
  }
}
