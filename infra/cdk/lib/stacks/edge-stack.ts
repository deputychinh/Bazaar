import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import { acknowledge } from '../aspects/nag.js';
import {
  ALB_DNS_PARAMETER,
  API_PATH,
  NEXT_STATIC_PATH,
  SUBDOMAINS,
} from '../constants/edge.constant.js';
import type { EdgeStackProps } from '../interfaces/edge-stack-props.interface.js';
import { imagesBucketName } from '../naming.js';

// Client-side routes of the admin SPA (/seller/orders, …) all load index.html; files keep their path.
const SPA_ROUTING = `function handler(event) {
  var request = event.request;
  if (request.uri.indexOf('.') === -1) request.uri = '/index.html';
  return request;
}`;

/**
 * CloudFront in front of everything (plan §9A.1): the customer site (SSR/ISR from the ALB,
 * `/_next/static` from S3), the admin SPA (S3) and product images (S3), each with `/api` to the
 * gateway where needed. WAF from EdgeGlobalStack; DNS and HTTPS names when a domain is configured.
 */
export class EdgeStack extends Stack {
  public readonly webDistribution: cloudfront.Distribution;
  public readonly adminDistribution: cloudfront.Distribution;
  public readonly imagesDistribution: cloudfront.Distribution;
  public readonly staticBucket: s3.Bucket;
  public readonly adminBucket: s3.Bucket;

  public constructor(scope: Construct, id: string, props: EdgeStackProps) {
    super(scope, id, { ...props, crossRegionReferences: true });
    const { config } = props;
    const domain = config.domainName;
    const removalPolicy = config.retainData ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    // CloudFront standard logs need ACLs on their bucket (ObjectWriter).
    const logs = new s3.Bucket(this, 'EdgeLogs', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      lifecycleRules: [{ expiration: Duration.days(config.logRetentionDays) }],
      removalPolicy,
      autoDeleteObjects: !config.retainData,
    });
    acknowledge(logs, [
      {
        id: 'AwsSolutions::AwsSolutions-S1',
        reason: 'This is the log bucket itself; logging it into itself would loop.',
      },
    ]);
    const siteBucket = (name: string): s3.Bucket =>
      new s3.Bucket(this, name, {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        versioned: true,
        objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
        serverAccessLogsBucket: logs,
        serverAccessLogsPrefix: `${name.toLowerCase()}/`,
        removalPolicy,
        autoDeleteObjects: !config.retainData,
      });
    this.staticBucket = siteBucket('WebStatic');
    this.adminBucket = siteBucket('AdminSite');

    // The ALB comes from the Ingress; with a domain it answers on origin.<domain> over HTTPS.
    // Without one (dev) CloudFront reaches it by its AWS name over HTTP — see the acknowledgement.
    const albOrigin = new origins.HttpOrigin(
      domain === undefined
        ? ssm.StringParameter.valueForStringParameter(this, ALB_DNS_PARAMETER(config.name))
        : `${SUBDOMAINS.origin}.${domain}`,
      {
        protocolPolicy:
          domain === undefined
            ? cloudfront.OriginProtocolPolicy.HTTP_ONLY
            : cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
      },
    );
    const apiBehavior: cloudfront.BehaviorOptions = {
      origin: albOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    };
    const staticBehavior = (bucket: s3.IBucket): cloudfront.BehaviorOptions => ({
      origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      compress: true,
    });
    const viewer = (subdomain?: string): Partial<cloudfront.DistributionProps> =>
      domain === undefined || props.certificate === undefined
        ? {}
        : {
            domainNames: [subdomain === undefined ? domain : `${subdomain}.${domain}`],
            certificate: props.certificate as acm.ICertificate,
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
          };
    const common = (prefix: string): Partial<cloudfront.DistributionProps> => ({
      webAclId: props.webAclArn,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      enableLogging: true,
      logBucket: logs,
      logFilePrefix: `${prefix}/`,
      publishAdditionalMetrics: true,
    });

    this.webDistribution = new cloudfront.Distribution(this, 'Web', {
      ...common('web'),
      ...viewer(),
      comment: `${config.name} customer site`,
      // SSG/ISR pages are cached as long as Next.js says (s-maxage); SSR pages send no-store.
      defaultBehavior: {
        origin: albOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.USE_ORIGIN_CACHE_CONTROL_HEADERS_QUERY_STRINGS,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        compress: true,
      },
      additionalBehaviors: {
        [NEXT_STATIC_PATH]: staticBehavior(this.staticBucket),
        [API_PATH]: apiBehavior,
      },
    });

    this.adminDistribution = new cloudfront.Distribution(this, 'Admin', {
      ...common('admin'),
      ...viewer(SUBDOMAINS.admin),
      comment: `${config.name} admin site`,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        ...staticBehavior(this.adminBucket),
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            function: new cloudfront.Function(this, 'SpaRouting', {
              code: cloudfront.FunctionCode.fromInline(SPA_ROUTING),
              runtime: cloudfront.FunctionRuntime.JS_2_0,
            }),
          },
        ],
      },
      additionalBehaviors: { [API_PATH]: apiBehavior },
    });

    this.imagesDistribution = new cloudfront.Distribution(this, 'Images', {
      ...common('images'),
      ...viewer(SUBDOMAINS.images),
      comment: `${config.name} product images`,
      defaultBehavior: staticBehavior(
        s3.Bucket.fromBucketName(this, 'ImagesBucket', imagesBucketName(config)),
      ),
    });

    if (domain !== undefined && config.hostedZoneId !== undefined) {
      const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
        hostedZoneId: config.hostedZoneId,
        zoneName: domain,
      });
      const alias = (id: string, distribution: cloudfront.IDistribution, name?: string): void => {
        new route53.ARecord(this, id, {
          zone,
          ...(name === undefined ? {} : { recordName: name }),
          target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        });
      };
      alias('WebAlias', this.webDistribution);
      alias('AdminAlias', this.adminDistribution, SUBDOMAINS.admin);
      alias('ImagesAlias', this.imagesDistribution, SUBDOMAINS.images);
      // The ALB serves origin.<domain>; the Ingress (overlays/aws) references this certificate.
      const originCertificate = new acm.Certificate(this, 'OriginCertificate', {
        domainName: `${SUBDOMAINS.origin}.${domain}`,
        validation: acm.CertificateValidation.fromDns(zone),
      });
      new ssm.StringParameter(this, 'OriginCertificateArn', {
        parameterName: `/bazaar/${config.name}/edge/origin-certificate-arn`,
        stringValue: originCertificate.certificateArn,
      });
    }

    this.acknowledgeFindings(domain === undefined);
  }

  private acknowledgeFindings(noDomain: boolean): void {
    acknowledge(this.imagesDistribution, [
      {
        id: 'Annotation::@aws-cdk/aws-cloudfront-origins:updateImportedBucketPolicyOac',
        reason: 'DataStack grants CloudFront (this account, OAC) read access on the images bucket.',
      },
    ]);
    const distributions = [this.webDistribution, this.adminDistribution, this.imagesDistribution];
    for (const distribution of distributions) {
      acknowledge(distribution, [
        {
          id: 'AwsSolutions::AwsSolutions-CFR1',
          reason: 'A public marketplace: no geo restriction; WAF and rate limits apply instead.',
        },
        ...(noDomain
          ? [
              {
                id: 'AwsSolutions::AwsSolutions-CFR4',
                reason:
                  'Dev without a domain uses the default *.cloudfront.net certificate, whose TLS policy CloudFront fixes.',
              },
            ]
          : []),
      ]);
    }
    if (noDomain) {
      for (const distribution of [this.webDistribution, this.adminDistribution]) {
        acknowledge(distribution, [
          {
            id: 'AwsSolutions::AwsSolutions-CFR5',
            reason:
              'Dev only: without a domain the ALB has no certificate, so CloudFront reaches it over HTTP inside AWS. Prod uses HTTPS to origin.<domain>.',
          },
        ]);
      }
    }
  }
}
