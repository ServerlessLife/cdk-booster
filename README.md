# ![CDK Booster](public/logo_landscape_light.svg)

**CDK Booster speeds up AWS CDK's bundling of TypeScript/JavaScript Lambda handlers**

One of the major downsides of CDK is that all operations are performed sequentially, including bundling code for Lambda handlers. This makes bundling extremely slow for large projects with many Lambda functions.

CDK Booster bundles all Lambda functions created with `NodejsFunction` construct at once and produces separate assets for Lambda handlers exactly the same as the CDK framework. It's extremely useful for large projects with numerous Lambda functions, though it doesn't provide significant benefits for small projects. Note that bundling is usually not the slowest part of deployment - most time is typically spent on CloudFormation deployment. CDK Booster only speeds up the bundling phase.

CDK Booster also detects when synthesis runs twice. This happens when some resources are unresolved and a lookup is needed, causing synthesis to run twice, including bundling. CDK Booster detects this scenario and avoids bundling Lambda handlers twice.

CDK Booster is a drop-in replacement requiring no code changes - only installation and a simple `cdk.json` modification.

### Key Benefits

- **Faster builds** for TypeScript/JavaScript Lambda projects
- **Drop-in replacement** for your current CDK setup
- **Avoids double bundling** when synthesis runs multiple times

## Installation

```bash
npm install cdk-booster
```

### Setup

Modify your `cdk.json` file:

**Replace this:**

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/your_app.ts"
}
```

**With this:**

```json
{
  "app": "npx cdk-booster bin/your_app.ts"
}
```

### Usage

All functions created with the `NodejsFunction` construct are automatically bundled using CDK Booster:

```typescript
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';

const functionTestJsEsModule = new lambda_nodejs.NodejsFunction(
  this,
  'TestJsEsModule',
  {
    entry: 'lambda.ts',
  },
);
```

## How It Works

CDK Booster operates through a multi-phase process:

1. **CDK code transpilation**

CDK Booster uses ESBuild to transpile/compile your CDK code and injects additional code to discover all Lambda functions in your project, along with their prebuild and postbuild commands.

2. **Running CDK code in Node Worker threads**

The transpiled code runs in Node.js worker threads. The injected code enables the discovery of Lambda functions.

3. **Lambda handlers transpilation**

All Lambda TypeScript/JavaScript code is bundled simultaneously using ESBuild's multiple entry points feature. This approach is what provides the significant speed improvement. Bundled assets are placed in the `cdk.out/bundling-temp-*` folders for CDK to consume.

4. **Standard CDK Execution**

The regular CDK synthesis process runs normally. When CDK attempts to bundle Lambda code, it discovers that assets have already been prepared and skips the bundling step.

5. **Smart Asset Reuse**

If CDK needs to run synthesis again (due to unresolved resources requiring lookups), CDK Booster detects this scenario and reuses the already-prepared bundled assets, avoiding duplicate work. Note that resolved lookups are stored in `cdk.context.json`. If that is available, the synthesis will not run again, but that means you need to commit the file to git if you want it to be available for CI/CD. It also needs to contain resolution for lookups for all environments.

## Requirements

- AWS CDK v2.x
- TypeScript or JavaScript Lambda handlers using `NodejsFunction` construct

## Authors

- [Marko (ServerlessLife)](https://www.serverlesslife.com/)
- ⭐ Your name here for significant code contributions

## Contributors

(alphabetical)

- ⭐ Your name here for notable code or documentation contributions, or sample projects submitted with a bug report that resulted in tool improvement.

## Disclaimer

CDK Booster is provided "as is," without warranty of any kind, expressed or implied. Use it at your own risk, and be mindful of potential impacts on performance, security, and costs when using it in your AWS environment.
