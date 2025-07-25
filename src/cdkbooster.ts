// ******  support require in for CJS modules ******
import { createRequire } from 'module';
// @ts-ignore
const require = createRequire(import.meta.url);
global.require = require;

import { getVersion } from './version.js';
import { Configuration } from './configuration.js';
import { Logger } from './logger.js';
import { getModuleDirname, getProjectDirname } from './getDirname.js';
import { CdkFramework } from './cdkFramework.js';

/**
 * Start the CDK Booster
 */
async function run() {
  const version = await getVersion();

  Logger.log(`Welcome to CDK Booster 🚀 version ${version}.`);

  await Configuration.readConfig();

  Logger.setVerbose(Configuration.config.verbose === true);

  Logger.verbose(
    `Parameters: \n${Object.entries(Configuration.config)
      .map(([key, value]) => ` - ${key}=${value}`)
      .join('\n')}`,
  );
  Logger.verbose(`NPM module folder: ${getModuleDirname()}`);
  Logger.verbose(`Project folder: ${getProjectDirname()}`);

  await new CdkFramework().prebuild(Configuration.config);
}

run().catch(Logger.error);
