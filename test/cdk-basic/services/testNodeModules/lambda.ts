import { Handler } from 'aws-lambda';
import { JSDOM } from 'jsdom';

/**
 * Regression test lambda for the cdk-booster bug: `nodeModules` install is
 * dropped in pre-bundled assets (see nodeModules in cdk-basic-stack.ts).
 * jsdom comes from nodeModules (same package as in the reporter's project).
 * Output is constant so compare-states.ts can compare invoke results.
 */
export const lambdaHandler: Handler = async () => {
  return {
    testExternalLib: typeof JSDOM === 'function',
  };
};
