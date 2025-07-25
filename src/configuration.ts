import { CbConfig } from './types/cbConfig.js';
// @ts-ignore // does not have types
import { getConfigFromCliArgs } from './getConfigFromCliArgs.js';
import { Logger } from './logger.js';

let config: CbConfig;

/**
 * Read configuration from CLI args, config file or wizard
 */
async function readConfig() {
  const configFromCliArgs = await getConfigFromCliArgs();
  Configuration.setConfig(configFromCliArgs as any); // not complete config

  Logger.setVerbose(configFromCliArgs.verbose === true);
}

/**
 * Set the configuration
 * @param newConfig
 */
function setConfig(newConfig: CbConfig) {
  config = newConfig;
}

export const Configuration = {
  readConfig,
  get config() {
    if (!config) {
      throw new Error('Config not initialized. Call readConfig() first.');
    }
    return config;
  },
  setConfig,
};
