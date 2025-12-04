// @ts-nocheck
import { workerData, parentPort } from 'node:worker_threads';
import { pathToFileURL } from 'url';
import { Logger } from './logger.mjs';

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
