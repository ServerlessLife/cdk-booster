#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkbasicStack } from '../lib/cdk-basic-stack';
import { CdkbasicStack2 } from '../lib/subfolder/cdk-basic-stack2';

// log all environment variables
//console.log('Environment Variables:', JSON.stringify(process.env, null, 2));

const app = new cdk.App();

let environment = app.node.tryGetContext('environment');

if (!environment) {
  //throw new Error('Environment is not set in the context');
  environment = 'test';
}

new CdkbasicStack(app, 'CdkbasicStack', {
  stackName: `${environment}-cdkbooster-cdk-basic`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new CdkbasicStack2(app, 'CdkbasicStack2', {
  stackName: `${environment}-cdkbooster-cdk-basic2`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
