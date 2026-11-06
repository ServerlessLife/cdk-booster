import { Handler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

/**
 * Regression test lambda for the cdk-booster bug: `nodeModules` install is
 * dropped in pre-bundled assets (see nodeModules in cdk-basic-stack.ts).
 * Output is constant so compare-states.ts can compare invoke results.
 */
export const lambdaHandler: Handler = async () => {
  return {
    testExternalLib: typeof uuidv4 === 'function',
  };
};
