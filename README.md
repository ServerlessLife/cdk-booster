# ![CDK Booster](public/logo_landscape_light.svg)

**CDK Booster speeds up to 3 times by the CDK framework's bundling of TypeScript or JavaScript code for Lambda handlers.**

One of the major downsides of CDK is that all operations are done sequentially. That included bundling code for Lambda handlers; because of that, bundling can be extremely slow for a large project.

CDK Booster bundles all Lambdas at once and produces separate assets for Lambda handlers exactly the same as the CDK framework. It is extremely useful for large projects with lots of Lambda functions. It does not make a huge difference for small projects. Note that bundinling is usualy not the slowes part of deployment. Most of the time is usually spent on deploying CloudFormation. CDK Booster speeds up only bundling.

CDK Booster also detects if synthesis is run twice. That happens if some resources are unresolved and a lookup is needed. In that case, synthesis is run twice, including bundling. CDK Booster detects that and avoids bundling Lambda handlers twice.

CDK Booster is a drop-in replacement. No code changes are needed, except installation of CDK Booster and modifying the cdk.json file to point to CDK Booster.

### Key Benefits

- **3x faster builds** for TypeScript Lambda projects
- **Avoid double bundling**
- **Drop-in replacement** for your current CDK setup

## Installation

```bash
npm install cdk-booster
```

Mofify `cdk.json`:

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

All functions that are created with the `NodejsFunction` construct are bundled using CDK Booster.

```typescript
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';

// testJsEsModule
const functionTestJsEsModule = new lambda_nodejs.NodejsFunction(
  this,
  'TestJsEsModule',
  {
    entry: 'lambda.ts',
  },
);
```

## How it works.

CDK Booster works in multiple phases

1. **Transpiling CDK code**

CDK Booster transpiles CDK code using ESBuild and injects some additional code to find all Lambdas that are in the project and their prebuild and postbuild commands.

2. **Running CDK code in Node Worker threads**

Transpiled code is then run in a Worker. The injected code makes it possible to get the Lambdas.

3. **Lambda handlers transpilation**

Bundles all Lambda TypeScript code simultaneously using ESBuild. Buundling evernthing in one go is possible using ESBuild multiple entry points. The assets are dropped in cdk.out/bundling-temp-\* folder, where they can be picked up by CDK.

4. **Regular CDK execution Phase**

In the last phase, the regular CDK is executed regularly. It detects that assets have already been prepared, so it skips bunding.

5. **Prepare assets again**

If some resources are unresolved and a lookup would be needed, the CDK would be run again, including the bootstrapping. CDK Booster detectct that and copy already prepare already tranpiled assets agen into cdk.out/bundling-temp-\* folder.

## Authors

- [Marko (ServerlessLife)](https://www.serverlesslife.com/)
- ⭐ Your name here for big code contributions.

## Contributors

(alphabetical)

- ⭐ Your name here for notable code or documentation contributions or sample projects submitted with a bug report that resulted in tool improvement.

## Disclaimer

Lambda Live Debugger is provided "as is," without warranty of any kind, expressed or implied. Use it at your own risk, and be mindful of potential impacts on performance, security, and costs when using it in your AWS environment.
