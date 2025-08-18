# ![CDK Booster](public/logo_landscape_light.svg)

**Supercharge your AWS CDK builds with parallel TypeScript Lambda bundling**

_Stop waiting for TypeScript compilation. Start deploying faster._

## 🚀 Transform Your TypeScript Development Workflow

Tired of watching your CDK builds crawl through TypeScript Lambda function compilation? **CDK Booster dramatically improves your build process** by bundling all TypeScript Lambda functions in parallel instead of the default sequential approach.

### ⚡ Key Benefits

- **3x faster builds** for TypeScript Lambda projects
- **Zero configuration changes** to your existing TypeScript Lambda code
- **Drop-in replacement** for your current CDK setup
- **Powered by ESBuild** for lightning-fast TypeScript compilation

## 📦 Quick Start

Get up and running in under 60 seconds:

```bash
npm install -g cdk-booster
```

## 🔧 Simple Setup

Transform your build process with one simple change in `cdk.json`:

**Replace this:**

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/cdk-app.ts"
}
```

**With this:**

```json
{
  "app": "npx cdk-booster bin/cdk-app.ts"
}
```

That's it! Your next deployment will be significantly faster.

## 👥 Perfect For TypeScript Projects

✅ **Large-scale TypeScript projects** with multiple Lambda functions \
✅ **TypeScript development teams** seeking faster iteration cycles \
✅ **DevOps engineers** optimizing TypeScript Lambda CI/CD pipelines \
✅ **Projects using TypeScript `NodejsFunction`** from `aws-cdk-lib/aws-lambda-nodejs` \

⚠️ **Note:** CDK Booster is designed specifically for TypeScript Lambda functions. JavaScript-only Lambda functions are not supported.

### Example

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

## 📈 Real Performance Impact

**Before CDK Booster:** Each TypeScript Lambda function waits for the previous one to complete compilation
**After CDK Booster:** All TypeScript Lambda functions compile simultaneously

Experience up to **3x speed improvement** in your TypeScript compilation phase, turning minutes of waiting into seconds of productivity.

## 🛠️ How The Magic Happens

CDK Booster uses an intelligent two-pass compilation strategy for TypeScript:

1. **Discovery Phase** - Analyzes your CDK code to identify all TypeScript Lambda functions
2. **Parallel TypeScript Compilation** - Bundles all Lambda TypeScript code simultaneously using ESBuild
3. **Execution Phase** - Runs your CDK deployment with pre-compiled TypeScript assets

This approach leverages CDK's built-in caching mechanisms while dramatically reducing build times.
