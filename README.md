# ![CDK Booster](public/logo_landscape_light.svg)

**Speed up AWS CDK's bundling of TypeScript/JavaScript Lambda handlers**

One of the major downsides of CDK is that all operations are performed sequentially, including bundling code for Lambda handlers. This makes bundling extremely slow for large projects with many Lambda functions.

CDK Booster bundles all Lambda functions created with `NodejsFunction` construct at once and produces separate assets for Lambda handlers exactly the same as the CDK framework. It's extremely useful for large projects with numerous Lambda functions, though it doesn't provide significant benefits for small projects. Note that bundling is usually not the slowest part of deployment - most time is typically spent on CloudFormation deployment. CDK Booster only speeds up the bundling phase.

CDK Booster also detects when synthesis runs twice. This happens when some resources are unresolved and a lookup is needed, causing synthesis to run twice, including bundling. CDK Booster detects this scenario and avoids bundling Lambda handlers twice.

CDK Booster is a drop-in replacement requiring no code changes - only installation and a simple `cdk.json` modification.

### Key Benefits

- **Faster builds** for TypeScript/JavaScript Lambda projects
- **Drop-in replacement** for your current CDK setup
- **Avoids double bundling** when synthesis runs multiple times

## Setup

```bash
npm install cdk-booster
```

Modify your `cdk.json` file:

**Replace this:**

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/your_app.ts",
  ...
}
```

**With this:**

```json
{
  "app": "npx cdk-booster bin/your_app.ts",
  ...
}
```

`bin/your_app.ts` is location to your CDK app.

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

### Command Line Parameters

CDK Booster supports several command-line parameters to customize its behavior:

#### Verbose Logging

To enable verbose logging for debugging purposes, add the `-v` parameter:

```json
{
  "app": "npx cdk-booster bin/your_app.ts -v",
  ...
}
```

#### Batch Size (`-b`, `--batch`)

Controls the number of Lambda functions bundled together in a single ESBuild batch. This is particularly useful for large projects with many Lambda functions (100+).

**Default:** No limit (all Lambdas with identical build settings are bundled together)

**When to use:**

- For projects with 100+ Lambda functions
- To reduce memory usage during builds

**Example:**

```json
{
  "app": "npx cdk-booster bin/your_app.ts -b 20",
  ...
}
```

Setting `-b 20` limits each ESBuild batch to 20 Lambda functions. If ESBuild crashes, only that batch of 20 functions is affected rather than all functions. Functions in the failed batch will still be bundled by CDK's standard process.

#### Parallel Builds (`-p`, `--parallel`)

Controls the maximum number of parallel ESBuild processes running simultaneously.

**Default:** Unlimited (all batches run in parallel)

**When to use:**

- To limit resource usage (CPU/memory) on constrained environments
- For CI/CD pipelines with limited resources
- When experiencing ESBuild crashes due to too many concurrent processes

**Example:**

```json
{
  "app": "npx cdk-booster bin/your_app.ts -p 1",
  ...
}
```

Setting `-p 1` ensures only one ESBuild process runs at a time, which can help prevent crashes on resource-constrained systems.

#### Combining Parameters

You can combine multiple parameters for fine-tuned control:

```json
{
  "app": "npx cdk-booster bin/your_app.ts -b 20 -p 2 -v",
  ...
}
```

### Skipping Specific Lambda Functions

You can exclude individual Lambda functions from CDK Booster processing by setting the `SKIP_CDK_BOOSTER` environment variable in the `bundling` property. This is useful when:

- A specific Lambda consistently causes bundling errors
- You want to use custom bundling settings for particular functions
- You need to debug issues with specific Lambda functions

**Important:** This is a bundling-time environment variable (set in `bundling.environment`), not a runtime environment variable for your Lambda function.

**Example:**

```typescript
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';

// This Lambda will be skipped by CDK Booster
new lambda_nodejs.NodejsFunction(this, 'ProblematicFunction', {
  entry: 'services/problematic/handler.ts',
  environment: {
    // Runtime environment variables for your Lambda
    API_ENDPOINT: 'https://api.example.com',
  },
  bundling: {
    environment: {
      // Bundling-time environment variable - tells CDK Booster to skip this function
      SKIP_CDK_BOOSTER: 'true',
    },
    minify: false,
    sourceMap: true,
  },
});
```

When a Lambda is skipped, CDK Booster ignores it during the pre-bundling phase, and AWS CDK will bundle it using its standard (slower) sequential process. The function will still work normally - it just won't benefit from CDK Booster's speed improvements.

## How It Works

CDK Booster operates through a multi-phase process:

1. **CDK code transpilation**

CDK Booster uses ESBuild to transpile/compile your CDK code and injects additional code to discover all Lambda functions in your project, along with their prebuild and postbuild commands.

2. **Running CDK code in Node Worker threads**

The transpiled code runs in Node.js worker threads. The injected code enables the discovery of Lambda functions.

3. **Lambda handlers bundling**

All Lambda TypeScript/JavaScript code is bundled simultaneously using ESBuild's multiple entry points feature. This approach is what provides the significant speed improvement. Bundled assets are placed in the `cdk.out/bundling-temp-*` folders for CDK to consume.

4. **Standard CDK Execution**

The regular CDK synthesis process runs normally. When CDK attempts to bundle Lambda code, it discovers that assets have already been prepared and skips the bundling step.

5. **Smart Asset Reuse**

If CDK needs to run synthesis again due to unresolved resources requiring lookups, CDK Booster detects this scenario and reuses the already-prepared bundled assets, avoiding duplicate work. Note that resolved lookups are stored in `cdk.context.json`. If that is available, the synthesis will not run again.

## Requirements

- AWS CDK v2.x with TypeScript
- TypeScript or JavaScript Lambda handlers using `NodejsFunction` construct

## Troubleshooting

For large projects (100+ Lambdas), if you encounter ESBuild crashes:

- **Upgrade ESBuild:** Try upgrading ESBuild to the latest version.
- **Start with:** `-b 5 -p 1` (batch size 5, sequential processing)
- **Then adjust:** Increase batch size or parallelism based on your system resources
- **Skip specific functions:** Add `SKIP_CDK_BOOSTER: 'true'` to `bundling.environment` for problematic Lambdas

## Authors

- [Marko (ServerlessLife)](https://www.serverlesslife.com/)
- ⭐ Your name here for significant code contributions

## Contributors

(alphabetical)

- ⭐ Your name here for notable code or documentation contributions, or sample projects submitted with a bug report that resulted in tool improvement.

## Disclaimer

CDK Booster is provided "as is," without warranty of any kind, expressed or implied. Use it at your own risk, and be mindful of potential impacts on performance, security, and costs when using it in your AWS environment.
