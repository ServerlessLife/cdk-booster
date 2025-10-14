import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NestedNestedStack } from './nested-nested-stack';
import * as path from 'path';

export class NestedStack extends cdk.NestedStack {
  public readonly nestedFunction: lambda_nodejs.NodejsFunction;
  public readonly nestedNestedFunction: lambda_nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    // Lambda function in nested stack
    this.nestedFunction = new lambda_nodejs.NodejsFunction(
      this,
      'NestedLambda',
      {
        entry: 'services/nestedStackHandler/lambda.ts',
        handler: 'lambdaHandler',
        runtime: lambda.Runtime.NODEJS_22_X,
        bundling: {
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

    // Create nested nested stack
    const nestedNestedStack = new NestedNestedStack(this, 'NestedNestedStack');

    // Expose nested nested function to parent stack
    this.nestedNestedFunction = nestedNestedStack.nestedNestedFunction;

    new cdk.CfnOutput(this, 'NestedFunctionName', {
      value: this.nestedFunction.functionName,
    });

    new cdk.CfnOutput(this, 'NestedNestedFunctionName', {
      value: nestedNestedStack.nestedNestedFunction.functionName,
    });
  }
}
