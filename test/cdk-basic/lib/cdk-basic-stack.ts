import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as path from 'path';

export class CdkbasicStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import default VPC
    const defaultVpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true,
    });

    const functionTestTsCommonJs = new lambda_nodejs.NodejsFunction(
      this,
      'TestTsCommonJs',
      {
        // a different way to get the path
        entry: path.join(__dirname, '../services/testTsCommonJs/lambda.ts'),
        handler: 'lambdaHandler',
        runtime: lambda.Runtime.NODEJS_22_X,
        //logRetention: log.RetentionDays.ONE_DAY,
        bundling: {
          environment: {
            TEST: 'TEST1',
          },
          commandHooks: {
            beforeBundling(): string[] {
              return [];
            },
            beforeInstall(): string[] {
              return [];
            },
            afterBundling(inputDir: string, outputDir: string): string[] {
              return [
                // command that checks the environment variable and shows a message if not equal
                `if [ "$TEST" != "TEST1" ]; then echo "TEST env var is not set to TEST1"; exit 1; fi`,

                `cp ${path.join(inputDir, 'test/cdk-basic/services/test.txt')} ${outputDir}`,
              ];
            },
          },
        },
      },
    );

    const functionTestTsEsModule = new lambda_nodejs.NodejsFunction(
      this,
      'TestTsEsModule',
      {
        entry: 'services/testTsEsModule/lambda.ts',
        handler: 'lambdaHandler',
        runtime: lambda.Runtime.NODEJS_22_X,
        //logRetention: log.RetentionDays.ONE_DAY,
        bundling: {
          format: lambda_nodejs.OutputFormat.ESM,

          commandHooks: {
            beforeBundling(): string[] {
              return [];
            },
            beforeInstall(): string[] {
              return [];
            },
            afterBundling(inputDir: string, outputDir: string): string[] {
              return [
                `cp ${path.join(inputDir, 'test/cdk-basic/services/test.txt')} ${outputDir}`,
              ];
            },
          },
        },
      },
    );

    const functionTestTsEsModule2 = new lambda_nodejs.NodejsFunction(
      this,
      'TestTsEsModule2',
      {
        entry: 'services/testTsEsModule/lambda.ts',
        handler: 'lambdaHandler',
        runtime: lambda.Runtime.NODEJS_22_X,
        //logRetention: log.RetentionDays.ONE_DAY,
        bundling: {
          format: lambda_nodejs.OutputFormat.ESM,
          commandHooks: {
            beforeBundling(): string[] {
              return [];
            },
            beforeInstall(): string[] {
              return [];
            },
            afterBundling(inputDir: string, outputDir: string): string[] {
              return [
                `cp ${path.join(inputDir, 'test/cdk-basic/services/test.txt')} ${outputDir}`,
              ];
            },
          },
        },
      },
    );

    const functionTestJsCommonJs = new lambda_nodejs.NodejsFunction(
      this,
      'TestJsCommonJs',
      {
        entry: 'services/testJsCommonJs/lambda.js',
        handler: 'lambdaHandler',
        runtime: lambda.Runtime.NODEJS_22_X,
        environment: {
          TEST: 'TEST',
        },
        //logRetention: log.RetentionDays.ONE_DAY,
        bundling: {
          environment: {
            TEST: 'TEST2',
          },
          commandHooks: {
            beforeBundling(inputDir: string, outputDir: string): string[] {
              // trying relative path without inputDir
              return [
                // command that checks the environment variable
                `if [ "$TEST" != "TEST2" ]; then echo "TEST env var is not set to TEST2"; exit 1; fi`,

                `cp test/cdk-basic/services/test.txt ${outputDir}`,
              ];
            },
            beforeInstall(): string[] {
              return [];
            },
            afterBundling(): string[] {
              return [];
            },
          },
        },
      },
    );

    new cdk.CfnOutput(this, 'FunctionNameTestTsCommonJs', {
      value: functionTestTsCommonJs.functionName,
    });

    new cdk.CfnOutput(this, 'FunctionNameTestTsEsModule', {
      value: functionTestTsEsModule.functionName,
    });

    new cdk.CfnOutput(this, 'FunctionNameTestTsEsModule2', {
      value: functionTestTsEsModule2.functionName,
    });

    new cdk.CfnOutput(this, 'FunctionNameTestJsCommonJs', {
      value: functionTestJsCommonJs.functionName,
    });

    new cdk.CfnOutput(this, 'DefaultVpcId', {
      value: defaultVpc.vpcId,
    });
  }
}
