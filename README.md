# ![CDK Booster](public/logo_landscape_light.svg)

Speed up your CDK Node.js bundling

What it does:
CDK transpiles/compiles each Lambda sequentaly which takes a lot of time. CDK booster does that in one go for all Lambdas.

How to use:
in cdk.json replace app parameter from:
{
"app": "npx ts-node --prefer-ts-exts bin/cdk-app.ts"
...
}

to:
{
"app": "npx cdk-booster bin/cdk-app.ts"
...
}

Whou should use it:
Tool is most suitavle for large project whit Lambdas writen in TypeScript. I only manages Lambdas created with NodejsFunction from aws-cdk-lib/aws-lambda-nodejs package. For example:

import \* as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
...
//testJsEsModule
const functionTestJsEsModule = new lambda_nodejs.NodejsFunction(
this,
'TestJsEsModule',
{
entry: 'lambda.ts',

      },
    );

For large project you could expect 3x speed increase. But note that this is just the transpiling part.

How does it do that. CDK booster compile CDK code twice. On first go inject aome additiona code to capture which TypeScript code needs to be transpiled/compiled. Then it transpiles that code. After that it compile CDK code again and execute it like it is normaly executed. CDK already have a mechanisem to detec if code have already been prepared. For al operations CDK booster use EsBuild.
