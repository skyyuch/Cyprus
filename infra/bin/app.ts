#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CyprusStack } from "../lib/cyprus-stack";

const app = new cdk.App();

new CyprusStack(app, "CyprusAetherStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    // Default to Singapore; override with CDK_DEFAULT_REGION or AWS_REGION.
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "ap-southeast-1",
  },
  description: "xSyphon Cyprus microsite — S3 + CloudFront + Lambda (/api/agent → Claude).",
});
