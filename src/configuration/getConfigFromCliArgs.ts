import { Command } from 'commander';
import { getVersion } from '../version.js';
import { LldConfigCliArgs } from '../types/lldConfig.js';

/**
 * Get configuration from CLI arguments
 * @param supportedFrameworks Supported frameworks
 * @returns Configuration
 */
export async function getConfigFromCliArgs(): Promise<LldConfigCliArgs> {
  const version = await getVersion();

  const program = new Command();

  program.name('lld').description('CDK Booster').version(version);
  program.option('-v, --verbose', 'Verbose logging');
  program.parse(process.argv);

  const args: any = program.opts();

  return args;
}
