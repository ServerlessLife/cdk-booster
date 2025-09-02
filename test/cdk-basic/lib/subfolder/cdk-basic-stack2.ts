import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class CdkbasicStack2 extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //testJsEsModule
    const functionTestJsEsModule = new lambda_nodejs.NodejsFunction(
      this,
      'TestJsEsModule',
      {
        entry: path.join(__dirname, '../../services/testJsEsModule/lambda.js'),
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

    new cdk.CfnOutput(this, 'FunctionNameTestJsEsModule', {
      value: functionTestJsEsModule.functionName,
    });
  }
}
