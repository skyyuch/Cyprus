/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CyprusAetherStack
 * - Private S3 bucket holds the built static site (dist/).
 * - CloudFront serves it over HTTPS via Origin Access Control (OAC).
 * - A Node Lambda implements POST /api/agent (Claude proxy), reachable only
 *   through CloudFront (Function URL with IAM auth + OAC). The ANTHROPIC_API_KEY
 *   lives in the Lambda env and never reaches the browser.
 */

import * as path from "path";
import { randomUUID } from "crypto";
import {
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  CfnOutput,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class CyprusStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Export it before deploying, e.g.\n" +
          "  ANTHROPIC_API_KEY=sk-ant-... npm run deploy",
      );
    }
    const anthropicModel = process.env.ANTHROPIC_MODEL;

    // Shared secret so the Lambda only answers requests coming through CloudFront
    // (CloudFront injects it as a custom origin header; the public Function URL is
    // otherwise unguessable). Set ORIGIN_SECRET to keep it stable across deploys.
    const originSecret = process.env.ORIGIN_SECRET || randomUUID();

    // --- Static site bucket (private; CloudFront-only access via OAC) ---
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // --- /api/agent Lambda (reuses the shared Anthropic forwarding core) ---
    const agentFn = new NodejsFunction(this, "AgentFn", {
      entry: path.join(__dirname, "..", "lambda", "agent.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        ANTHROPIC_API_KEY: anthropicKey,
        ORIGIN_SECRET: originSecret,
        ...(anthropicModel ? { ANTHROPIC_MODEL: anthropicModel } : {}),
      },
      bundling: {
        target: "node20",
        minify: true,
        sourceMap: false,
      },
    });

    // Public Function URL gated by the shared secret header injected by CloudFront
    // (OAC+IAM signing breaks on POST bodies, so we use NONE + a secret instead).
    const agentUrl = agentFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // --- CloudFront distribution ---
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "xSyphon Cyprus microsite",
      defaultRootObject: "index.html",
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        "/api/agent": {
          origin: new origins.FunctionUrlOrigin(agentUrl, {
            customHeaders: { "x-origin-secret": originSecret },
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          // Forward the body + content-type but not Host (Function URL validates Host).
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    });

    // --- Upload the built site + invalidate on deploy ---
    new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "..", "..", "dist"))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    new CfnOutput(this, "SiteURL", {
      value: `https://${distribution.distributionDomainName}`,
      description: "Public microsite URL (CloudFront).",
    });
    new CfnOutput(this, "BucketName", { value: siteBucket.bucketName });
    new CfnOutput(this, "DistributionId", { value: distribution.distributionId });
  }
}
