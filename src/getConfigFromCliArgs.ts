import { Command } from 'commander';
import { getVersion } from './version.js';
import { CbConfig } from './types/cbConfig.js';

/**
 * Get configuration from CLI arguments
 * @param supportedFrameworks Supported frameworks
 * @returns Configuration
 */
export async function getConfigFromCliArgs(): Promise<CbConfig> {
  const version = await getVersion();

  const program = new Command();

  program.name('cdk-booster').description('CDK Booster').version(version);
  program.option('-v, --verbose', 'Verbose logging');
  program.arguments('<string>');

  program.parse(process.argv);

  const args: any = program.opts();

  const entryFile = program.args[0];
  if (!entryFile) {
    program.outputHelp();
    throw new Error('Entry file is required');
  }
  args.entryFile = entryFile;

  return args;
}
