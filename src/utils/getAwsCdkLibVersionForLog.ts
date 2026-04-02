import { createRequire } from 'module';
import { existsSync } from 'fs';
import * as path from 'path';

/**
 * Version of aws-cdk-lib for logs. Must resolve from the CDK app directory
 * (cwd), not from cdk-booster's dist/ — otherwise in a monorepo the hoisted
 * root copy wins and masks pinned versions in workspace packages.
 */
export function getAwsCdkLibVersionForLog(): string | undefined {
  try {
    const projectPkg = path.join(process.cwd(), 'package.json');
    if (existsSync(projectPkg)) {
      const projectRequire = createRequire(projectPkg);
      return (projectRequire('aws-cdk-lib/package.json') as { version: string })
        .version;
    }
  } catch {
    // not resolvable from project tree
  }
  try {
    const moduleRequire = createRequire(import.meta.url);
    return (moduleRequire('aws-cdk-lib/package.json') as { version: string })
      .version;
  } catch {
    return undefined;
  }
}
