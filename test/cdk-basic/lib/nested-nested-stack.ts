import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class NestedNestedStack extends cdk.NestedStack {
  public readonly nestedNestedFunction: lambda_nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    // Lambda function in nested nested stack
    this.nestedNestedFunction = new lambda_nodejs.NodejsFunction(
      this,
      'NestedNestedLambda',
      {
        entry: 'services/nestedNestedStackHandler/lambda.ts',
        handler: 'lambdaHandler',
        runtime: lambda.Runtime.NODEJS_22_X,
        description: 'Lambda function in nested nested stack',
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

    new cdk.CfnOutput(this, 'NestedNestedFunctionName', {
      value: this.nestedNestedFunction.functionName,
    });
  }
}
