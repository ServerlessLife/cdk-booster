// @ts-nocheck
import { createRequire } from 'node:module';
import { workerData, parentPort } from 'node:worker_threads';
import { pathToFileURL } from 'url';
import { Logger } from './logger.mjs';

// Worker threads expose process.stdin/out/err as WritableWorkerStdio; child_process
// only accepts real fds, pipes, or certain strings. CDK passes process.stderr in
// stdio arrays — normalize to numeric fds before any app (or aws-cdk-lib) loads.
const require = createRequire(import.meta.url);
const cp = require('node:child_process');
const origSpawn = cp.spawn.bind(cp);
const origSpawnSync = cp.spawnSync.bind(cp);

function normalizeStdioOptions(options) {
  if (!options || typeof options !== 'object') return options;
  const { stdio } = options;
  if (!Array.isArray(stdio)) return options;
  const next = stdio.map((s) => {
    if (s === process.stdin) return 0;
    if (s === process.stdout) return 1;
    if (s === process.stderr) return 2;
    return s;
  });
  return { ...options, stdio: next };
}

cp.spawn = function spawn(command, args, options) {
  if (Array.isArray(args)) {
    return origSpawn(command, args, normalizeStdioOptions(options));
  }
  return origSpawn(command, normalizeStdioOptions(args));
};

cp.spawnSync = function spawnSync(command, args, options) {
  if (Array.isArray(args)) {
    return origSpawnSync(command, args, normalizeStdioOptions(options));
  }
  return origSpawnSync(command, normalizeStdioOptions(args));
};

Logger.setVerbose(workerData.verbose);
process.env.CDK_OUTDIR = 'cdk.out';
process.env.CDK_BOOSTER_INSPECT = 'true';

Logger.verbose(`[Worker] Started`);

parentPort.on('message', async (data) => {
  try {
    // this is global variable to store the data from the CDK code once it is executed
    global.lambdas = [];

    Logger.verbose(`[Worker] Received message`, data);

    // execute code to get the data into global.lambdas
    await import(pathToFileURL(data.compileOutput).href);

    const cloudAssembly = await global.cdkApp.synth();
    global.cdkApp.synth = () => undefined; // prevent call
    const missing = !!cloudAssembly.manifest.missing;

    const lambdas = global.lambdas;

    if (!global.lambdas || global.lambdas?.length === 0) {
      Logger.verbose(`[Worker] No Lambda functions found.`);
    } else {
      Logger.verbose(
        `[Worker] Sending found Lambdas`,
        JSON.stringify(lambdas, null, 2),
      );
    }
    Logger.verbose(
      `[Worker] ${missing ? 'Some resources are missing and need to be looked up. Synth will have to be run twice.' : 'All resources are resolved.'}`,
    );

    // send the data back to the main thread
    parentPort.postMessage({ lambdas, missing });
  } catch (error) {
    Logger.error(`[Worker] Error`, error);
    throw error;
  }
});

process.on('unhandledRejection', (error) => {
  Logger.error(`[Worker] Unhandled Rejection`, error);
});
