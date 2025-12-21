// ******  support require in for CJS modules ******
import { createRequire } from 'module';
// @ts-ignore
const require = createRequire(import.meta.url);
global.require = require;

import { getVersion } from './version.js';
import { Configuration } from './configuration.js';
import { Logger } from './logger.js';
import { getModuleDirname, getProjectDirname } from './getDirname.js';
import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { outputFolder } from './constants.js';
import { findPackageJson } from './utils/findPackageJson.js';
import { CbConfig } from './types/cbConfig.js';
import { Worker } from 'node:worker_threads';
import { type BundlingOptions } from 'aws-cdk-lib/aws-lambda-nodejs';
import { spawn } from 'node:child_process';
import { LambdaBundle } from './types/lambdaBundle.js';
import { BundleSettings } from './types/bundleSettings.js';
import crypto from 'node:crypto';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'node:url';
import * as os from 'os';

type EsBuildOutputs = esbuild.Metafile['outputs'];

/**
 * Start the CDK Booster
 */
async function run() {
  let copyAgainFunction: (() => Promise<void>) | undefined;
  const version = await getVersion();

  Logger.log(`Welcome to CDK Booster 🚀 version ${version}.`);

  await Configuration.readConfig();

  Logger.setVerbose(Configuration.config.verbose === true);

  Logger.verbose(
    `Parameters: ${Object.entries(Configuration.config)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')}`,
  );
  Logger.verbose(`NPM module folder: ${getModuleDirname()}`);
  Logger.verbose(`Project folder: ${getProjectDirname()}`);

  const config = Configuration.config;
  const rootDir = process.cwd();

  Logger.verbose(`Compiling CDK code from ${config.entryFile}`);

  const compileCodeFile = await compileCdk({
    rootDir,
    entryFile: config.entryFile,
    tsconfig: config.tsconfig,
  });

  Logger.verbose(
    ` Running the CDK code ${compileCodeFile} to extract Lambda functions.`,
  );

  const secondRun = await isSecondRun();

  Logger.verbose(
    secondRun ? `This is the second run.` : `This is the first run.`,
  );

  if (!secondRun) {
    // Clean up any existing bundling temp folders before starting
    await deleteBundlingTempFolders();

    const { lambdas, missing } = await runCdkCodeAndReturnLambdas({
      config,
      compileCodeFile,
    });

    Logger.verbose(
      `Found ${lambdas.length} Lambda functions in the CDK code:`,
      JSON.stringify(lambdas, null, 2),
    );

    let lambdasEsBuildCommands = lambdas as any as Array<LambdaBundle>;

    // skip all lambdas that have SKIP_CDK_BOOSTER env var set to true in their bundling environment
    lambdasEsBuildCommands = lambdasEsBuildCommands.filter(
      (lambda) => lambda.environment?.SKIP_CDK_BOOSTER !== 'true',
    );

    if (lambdasEsBuildCommands.length === 0) {
      Logger.log(
        `No Lambda functions found by the CDK Booster. Skipping bundling.`,
      );
    } else {
      // Prepare bundling temp folders for each Lambda function
      await recreateBundlingTempFolders(lambdasEsBuildCommands);

      // Execute pre-bundling commands
      await executeCommands(lambdasEsBuildCommands, 'commandBeforeBundling');

      const outputs: EsBuildOutputs = await bundle(lambdasEsBuildCommands);

      // move files to the output folder
      await copyFilesToOutput(lambdasEsBuildCommands, outputs);

      // Execute post-bundling commands
      await executeCommands(lambdasEsBuildCommands, 'commandAfterBundling');

      if (missing) {
        copyAgainFunction = async () => {
          await recreateBundlingTempFolders(lambdasEsBuildCommands);
          await executeCommands(
            lambdasEsBuildCommands,
            'commandBeforeBundling',
          );
          await copyFilesToOutput(lambdasEsBuildCommands, outputs);
          await executeCommands(lambdasEsBuildCommands, 'commandAfterBundling');
        };
      }

      Logger.log(
        `All Lambda functions have been built and copied to the output folder.`,
      );
    }
  }

  Logger.log(`Starting to run regular CDK code.`);

  // Regular import and execution of the compiled CDK code
  await import(pathToFileURL(compileCodeFile).href);

  if (copyAgainFunction) {
    Logger.verbose(
      `Some resources are missing and need to be looked up. The synth process will run again. Assets will be copied again to avoid re-bundling.`,
    );
    await copyAgainFunction();
  }
}

/**
 * Bundle Lambda functions using esbuild
 * @param lambdasEsBuildCommands - Array of Lambda bundle configurations
 * @returns esbuild metafile outputs mapping
 */
async function bundle(lambdasEsBuildCommands: LambdaBundle[]) {
  const tempFolder = path.resolve(path.join(outputFolder, 'bundle'));

  let outputs: EsBuildOutputs = {};

  // Create build combinations grouped by identical build options to optimize bundling
  const buildBatches = createBuildCombinations(lambdasEsBuildCommands);

  // Bundle each group of functions with identical build options
  const buildPromises: Promise<any>[] = [];
  let parallelCount = 0;

  for (const buildBatch of buildBatches) {
    const build = async () => {
      parallelCount++;
      const buildOptions = buildBatch.buildOptions;
      const entryPoints = buildBatch.entryPoints;

      try {
        const normalizedEsbuildArgs = normalizeEsbuildArgs(
          buildOptions.esbuildArgs,
        );

        const esBuildOpt: esbuild.BuildOptions = {
          entryPoints,
          bundle: true,
          platform: 'node',
          outdir: tempFolder,
          target: buildOptions.target,
          format: buildOptions.format,
          minify: buildOptions.minify,
          sourcemap: buildOptions.sourcemap,
          sourcesContent: buildOptions.sourcesContent,
          external: buildOptions.external,
          loader: buildOptions.loader,
          define: buildOptions.define,
          logLevel: buildOptions.logLevel,
          keepNames: buildOptions.keepNames,
          tsconfig: buildOptions.tsconfig,
          banner: buildOptions.banner,
          footer: buildOptions.footer,
          mainFields: buildOptions.mainFields,
          inject: buildOptions.inject,
          alias: normalizedEsbuildArgs?.alias,
          drop: normalizedEsbuildArgs?.drop as esbuild.Drop[],
          pure: normalizedEsbuildArgs?.pure,
          logOverride: normalizedEsbuildArgs?.logOverride,

          // I need this to properly output bundled files
          entryNames: '[dir]/[name]-[hash]/index',
          metafile: true,
          outExtension: { '.js': '.mjs' },
        };

        if (Logger.isVerbose()) {
          Logger.verbose(
            `Bundling with options:`,
            JSON.stringify(esBuildOpt, null, 2),
            `following functions:\n - ${entryPoints.join('\n - ')}`,
          );
        } else {
          Logger.log(`Bundling:\n - ${entryPoints.join('\n - ')}`);
        }
        const buildingResults = await esbuild.build(esBuildOpt);

        outputs = {
          ...outputs,
          ...buildingResults.metafile?.outputs,
        };
      } catch (error: any) {
        Logger.error(
          `The following functions failed to bundle:\n - ${entryPoints.join('\n - ')}. Set batch parameter (-b) to a smaller number, like 5, to lower the chance of this error, and in case of error, a smaller batch would be affected.`,
          error,
        );
      } finally {
        parallelCount--;
      }
    };

    const parallel = Configuration.config.parallel;

    // if parallel is set, limit the number of parallel builds
    if (parallel && parallel > 0 && parallelCount >= parallel) {
      await Promise.race(buildPromises);
    }

    buildPromises.push(build());
  }

  await Promise.all(buildPromises);

  Logger.log(`All functions have been bundled.`);

  return outputs;
}

/**
 * Copy built files from esbuild output to the cdk.out/bundling-temp-* folders
 * @param lambdasEsBuildCommands - Array of Lambda bundle configurations
 * @param outputs - esbuild metafile outputs mapping
 */
async function copyFilesToOutput(
  lambdasEsBuildCommands: LambdaBundle[],
  outputs: EsBuildOutputs,
) {
  await Promise.all(
    lambdasEsBuildCommands.map(async (lambdasEsBuildCommand) => {
      let esBuildOutput: string | undefined;

      for (const outputFile in outputs) {
        const output = outputs[outputFile];

        const entryPoint = output.entryPoint
          ? path.resolve(output.entryPoint)
          : undefined;

        if (
          entryPoint &&
          (lambdasEsBuildCommand.entryPoint.endsWith(entryPoint) ||
            lambdasEsBuildCommand.entryPoint.endsWith(output.entryPoint!))
        ) {
          esBuildOutput = outputFile;

          break;
        }
      }

      if (!esBuildOutput) {
        throw new Error(
          `No output found for entry point ${lambdasEsBuildCommand.entryPoint}`,
        );
      }

      // const source = path.dirname(
      //   path.resolve(path.join(rootFolder, esBuildOutput)),
      // );
      const source = path.dirname(path.resolve(esBuildOutput));
      const entryOutputFilename = lambdasEsBuildCommand.out.replaceAll(
        '-building',
        '',
      );
      const target = path.dirname(entryOutputFilename);

      Logger.verbose(`Moving files from ${source} to ${target}`);

      // create folder if it doesn't exist
      await copyFolderRecursive(source, target, entryOutputFilename);
    }),
  );

  Logger.log(`All built files have been copied to the output folders.`);
}

/**
 * Check if this is the second run of the CDK Booster
 * @returns True if this is the second run, false otherwise
 */
async function isSecondRun() {
  // second run is if there is cdk.out/manifest.json file with node missing
  const manifestPath = path.join(process.cwd(), 'cdk.out', 'manifest.json');
  const manifestExists = await fs
    .access(manifestPath)
    .then(() => true)
    .catch(() => false);

  if (!manifestExists) return false;

  const manifestRaw = await fs.readFile(manifestPath, { encoding: 'utf-8' });
  const manifest = JSON.parse(manifestRaw);
  return !!manifest.missing;
}

/**
 * Create build combinations grouped by build options hash for efficient bundling
 * @param lambdasEsBuildCommands - Array of Lambda bundle configurations
 * @returns Array of build combinations with hashed build options
 */
function createBuildCombinations(lambdasEsBuildCommands: LambdaBundle[]) {
  const buildCombinations = lambdasEsBuildCommands.map(
    (lambdasEsBuildCommand) => {
      // Create a copy of the command without non-build-related properties
      const copy: Partial<LambdaBundle> = {
        ...lambdasEsBuildCommand,
      };

      // Remove properties that don't affect the build configuration
      delete copy.outfile;
      delete copy.command;
      delete copy.entryPoint;
      delete copy.out;
      delete copy.commandBeforeBundling;
      delete copy.commandAfterBundling;

      const buildOptions: BundleSettings = copy;
      const entryPoint = lambdasEsBuildCommand.entryPoint;

      // Create a hash of build options to group identical configurations
      const buildOptionsHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(buildOptions))
        .digest('hex');

      return {
        buildOptions,
        entryPoint,
        buildOptionsHash,
      };
    },
  );

  const buildBatches: Array<{
    entryPoints: string[];
    buildOptions: BundleSettings;
  }> = [];

  const batchSize = Configuration.config.batch;

  // Group by unique build option hashes to bundle functions with identical settings together
  const uniqueBuildHashes = new Set(
    buildCombinations.map((b) => b.buildOptionsHash),
  );

  for (const buildHash of uniqueBuildHashes) {
    const buildBatch = buildCombinations.filter(
      (b) => b.buildOptionsHash === buildHash,
    );

    let entryPoints: string[] = buildBatch.map((b) => b.entryPoint);
    // unique entry points
    entryPoints = Array.from(new Set(entryPoints));

    // if batch size is set and if each buildOptionsHash has more than batchSize entries, split them
    if (batchSize && entryPoints.length > batchSize) {
      for (let i = 0; i < entryPoints.length; i += batchSize) {
        const chunk = entryPoints.slice(i, i + batchSize);
        buildBatches.push({
          entryPoints: chunk,
          buildOptions: buildBatch[0].buildOptions,
        });
      }
    } else {
      buildBatches.push({
        entryPoints,
        buildOptions: buildBatch[0].buildOptions,
      });
    }
  }

  return buildBatches;
}

/**
 * Convert esbuildArgs with CLI-style keys into esbuild options object.
 * This normalizes command-line style arguments into the format expected by esbuild.
 * @param esbuildArgs - CLI-style esbuild arguments
 * @returns Normalized esbuild options object
 */
export function normalizeEsbuildArgs(
  esbuildArgs: { [key: string]: string | boolean } = {},
) {
  const out: {
    alias?: Record<string, string>;
    drop?: string[];
    pure?: string[];
    logOverride?: Record<
      string,
      'verbose' | 'debug' | 'info' | 'warning' | 'error' | 'silent'
    >;
    outExtension?: Record<string, string>;
  } = {};

  for (const [key, value] of Object.entries(esbuildArgs)) {
    const [prefix, name] = key.split(':');

    switch (prefix) {
      case '--alias':
        out.alias ??= {};
        if (name && typeof value === 'string') out.alias[name] = value;
        break;

      case '--drop':
        out.drop ??= [];
        if (name) out.drop.push(name);
        else if (typeof value === 'string') out.drop.push(...value.split(','));
        break;

      case '--pure':
        out.pure ??= [];
        if (name) out.pure.push(name);
        else if (typeof value === 'string') out.pure.push(...value.split(','));
        break;

      case '--log-override':
        out.logOverride ??= {};
        if (name && typeof value === 'string')
          out.logOverride[name] = value as any;
        break;

      case '--out-extension':
        out.outExtension ??= {};
        if (name && typeof value === 'string') out.outExtension[name] = value;
        break;
    }
  }

  return out;
}

/**
 * Delete all bundling temp folders in the cdk.out folder
 */
async function deleteBundlingTempFolders(): Promise<void> {
  const rootDir = process.cwd();
  const cdkOutFolder = path.join(rootDir, 'cdk.out');

  try {
    Logger.verbose(`Cleaning bundling temp folders in ${cdkOutFolder}`);
    const bundlingTempFolders = await fs.readdir(cdkOutFolder);

    await Promise.all(
      bundlingTempFolders.map(async (folder) => {
        const folderPath = path.join(cdkOutFolder, folder);
        if (folder.startsWith('bundling-temp-')) {
          Logger.verbose(`Deleting bundling temp folder: ${folderPath}`);
          await fs.rm(folderPath, { recursive: true, force: true });
        }
      }),
    );

    Logger.verbose(`Successfully cleaned bundling temp folders`);
  } catch (error: any) {
    // If cdk.out doesn't exist yet, that's fine - we'll create it later
    if (error.code === 'ENOENT') {
      // cdk.out folder doesn't exist yet, skipping cleanup
    } else {
      throw new Error(`Error cleaning bundling temp folders`, { cause: error });
    }
  }
}

/**
 * Recreate bundling-temp-*** folders in the cdk.out folder
 * @param lambdasEsBuildCommands
 */
async function recreateBundlingTempFolders(
  lambdasEsBuildCommands: LambdaBundle[],
) {
  await Promise.all(
    lambdasEsBuildCommands.map(async (lambdasEsBuildCommand) => {
      const entryOutputFilename = lambdasEsBuildCommand.out.replaceAll(
        '-building',
        '',
      );
      const target = path.dirname(entryOutputFilename);

      // create folder
      await fs.mkdir(target, { recursive: true });
      Logger.verbose(
        `Created bundling temp folder: ${target} for ${lambdasEsBuildCommand.entryPoint}`,
      );
    }),
  );
}

/**
 * Compile CDK TypeScript/JavaScript code into a single executable file
 * This bundles the CDK code with necessary patches for Lambda function extraction
 * @param options - Compilation options including root directory and entry file
 * @returns Path to the compiled CDK code file
 */
async function compileCdk({
  rootDir,
  entryFile,
  tsconfig,
}: {
  rootDir: string;
  entryFile: string;
  tsconfig?: string;
}) {
  const isESM = await isEsm(entryFile);

  // Plugin that:
  // - Fixes __dirname issues in bundled code
  // - Injects code to extract Lambda function configurations from CDK
  const injectCodePlugin: esbuild.Plugin = {
    name: 'injectCode',
    setup(build: esbuild.PluginBuild) {
      build.onLoad({ filter: /.*/ }, async (args: esbuild.OnLoadArgs) => {
        // fix __dirname issues
        const isWindows = /^win/.test(process.platform);
        const esc = (p: string) => (isWindows ? p.replace(/\\/g, '/') : p);

        const variables = `
              const __fileloc = {
                filename: "${esc(args.path)}",
                dirname: "${esc(path.dirname(args.path))}",
                relativefilename: "${esc(path.relative(rootDir, args.path))}",
                relativedirname: "${esc(
                  path.relative(rootDir, path.dirname(args.path)),
                )}",
                import: { meta: { url: "file://${esc(args.path)}" } }
              };
            `;

        let fileContent = new TextDecoder().decode(
          await fs.readFile(args.path),
        );

        // remove shebang
        if (fileContent.startsWith('#!')) {
          const firstNewLine = fileContent.indexOf('\n');
          fileContent = fileContent.slice(firstNewLine + 1);
        }

        let contents: string;
        if (args.path.endsWith('.ts') || args.path.endsWith('.js')) {
          // add the variables at the top of the file, that contains the file location
          contents = `${variables}\n${fileContent}`;
        } else {
          contents = fileContent;
        }

        // for .mjs files, use js loader
        const fileExtension = args.path.split('.').pop();
        const loader: esbuild.Loader =
          fileExtension === 'mjs' || fileExtension === 'cjs'
            ? 'js'
            : (fileExtension as esbuild.Loader);

        // Inject code to extract Lambda function configurations
        if (
          args.path.includes(
            path.join('aws-cdk-lib', 'aws-lambda-nodejs', 'lib', 'bundling.'),
          )
        ) {
          contents = contents.replace(
            'return chain([...this.props.commandHooks',
            'const command = chain([...this.props.commandHooks',
          );

          const codeToFind =
            'afterBundling(options.inputDir,options.outputDir)??[]])';

          if (!contents.includes(codeToFind)) {
            throw new Error(`Can not find code to inject in ${args.path}`);
          }

          // Inject code to get the file path of the Lambda function and CDK hierarchy
          // path to match it with the Lambda function. Store data in the global variable.

          //NOTE: This handles diferent versions of CDK. Newer versions use scope
          // target: this.props.target ?? (typeof scope !== "undefined" ? toTarget(scope,this.props.runtime): toTarget(this.props.runtime)),

          contents = contents.replace(
            codeToFind,
            codeToFind +
              `;
              if (process.env.CDK_BOOSTER_INSPECT === 'true') {
                if (!options.outputDir.startsWith('/asset-output')) {
                  global.lambdas = global.lambdas ?? [];

                  const out = pathJoin(options.outputDir,outFile);

                  const lambdaInfo = {
                    command: command,
                    entryPoint: relativeEntryPath,
                    out,
                    target: this.props.target ?? (typeof scope !== "undefined" ? toTarget(scope,this.props.runtime): toTarget(this.props.runtime)),
                    format: this.props.format,
                    minify: this.props.minify,
                    sourcemap: sourceMapEnabled ? ((this.props.sourceMapMode === 'default' || !this.props.sourceMapMode) ? true : this.props.sourceMapMode) : false,
                    sourcesContent,
                    external: this.externals,
                    loader: this.props.loader,
                    define: this.props.define,
                    logLevel: this.props.logLevel,
                    keepNames: this.props.keepNames,
                    tsconfig: this.relativeTsconfigPath ? pathJoin(options.inputDir, this.relativeTsconfigPath): undefined,
                    banner: this.props.banner ? { js: this.props.banner } : undefined,
                    footer: this.props.footer ? { js: this.props.footer } : undefined,
                    mainFields: this.props.mainFields,
                    inject: this.props.inject,
                    esbuildArgs: this.props.esbuildArgs,
                    commandBeforeBundling: chain([...this.props.commandHooks?.beforeBundling(options.inputDir, options.outputDir) ?? [], tscCommand]),
                    commandAfterBundling: chain([...(this.props.nodeModules && this.props.commandHooks?.beforeInstall(options.inputDir, options.outputDir)) ?? [], depsCommand, ...this.props.commandHooks?.afterBundling(options.inputDir, options.outputDir) ?? []]),
                    environment: this.environment,
                    projectRoot: this.projectRoot,
                  };

                  global.lambdas.push(lambdaInfo);

                  const fs = require('fs');
                  const path = require('path');
                  const dir = path.dirname(out);
                  fs.mkdirSync(dir, { recursive: true });
                  fs.writeFileSync(out, '');
                }
              }
              return command;
              `,
          );

          const codeToFind3 =
            'return(0,util_1().exec)(osPlatform==="win32"?"cmd":"bash",[osPlatform==="win32"?"/c":"-c",localCommand],{env:{...process.env,...environment},stdio:["ignore",process.stderr,"inherit"],cwd,windowsVerbatimArguments:osPlatform==="win32"}),!0';
          contents = contents.replace(
            codeToFind3,
            `return (process.env.CDK_BOOSTER_INSPECT === 'true') ? true : (${codeToFind3.replace('return', '')})`,
          );

          Logger.verbose(`Injected code into ${args.path}`);
        } else if (
          args.path.includes(
            path.join(
              'aws-cdk-lib',
              'aws-s3-deployment',
              'lib',
              'bucket-deployment.',
            ),
          )
        ) {
          let codeToFind = 'super(scope,id),this.requestDestinationArn=!1;';

          if (!contents.includes(codeToFind)) {
            // newer CDK version
            codeToFind = 'super(scope,id);';
          }

          if (!contents.includes(codeToFind)) {
            throw new Error(`Can not find code to inject in ${args.path}`);
          }

          // Inject code to prevent deploying the assets
          contents = contents.replace(codeToFind, codeToFind + `return;`);

          Logger.verbose(`Injected code into ${args.path}`);
        } else if (
          args.path.includes(path.join('aws-cdk-lib', 'core', 'lib', 'app.'))
        ) {
          const codeToFind =
            ',policyValidationBeta1:props.policyValidationBeta1});';

          if (!contents.includes(codeToFind)) {
            throw new Error(`Can not find code to inject in ${args.path}`);
          }

          // make CDK app available
          contents = contents.replace(
            codeToFind,
            codeToFind + `global.cdkApp = this;`,
          );

          Logger.verbose(`Injected code into ${args.path}`);
        } else if (
          args.path.includes(
            path.join('aws-cdk-lib', 'core', 'lib', 'asset-staging.'),
          )
        ) {
          const codeToFind = 'if(fs().existsSync(bundleDir))return;';

          if (!contents.includes(codeToFind)) {
            throw new Error(`Can not find code to inject in ${args.path}`);
          }

          // Inject code to get the file path of the Lambda function and CDK hierarchy
          contents = contents.replace(
            codeToFind,
            `
            if (process.env.CDK_BOOSTER_SKIP === 'true') {
              console.log('[🚀 CDK Booster]', "Skipping asset bundling");
              return;
            }
            if(fs().existsSync(bundleDir)) {
              if (process.env.CDK_BOOSTER_INSPECT !== 'true') {
                console.log('[🚀 CDK Booster]', "😀 Function " + options.relativeEntryPath + " was prebundled");
              }
              return;
            }
            if (process.env.CDK_BOOSTER_INSPECT !== 'true') {
              console.error('[🚀 CDK Booster]', "🚨 Function " + options.relativeEntryPath + " was not prebundled");
            }
            `,
          );

          Logger.verbose(`Injected code into ${args.path}`);
        }

        return {
          contents,
          loader,
        };
      });
    },
  };

  const compileCodeFile = path.join(
    getProjectDirname(),
    outputFolder,
    `compiledCdk.${isESM ? 'mjs' : 'cjs'}`,
  );

  try {
    // Build CDK code
    await esbuild.build({
      entryPoints: [entryFile],
      bundle: true,
      platform: 'node',
      keepNames: true,
      outfile: compileCodeFile,
      sourcemap: false,
      plugins: [injectCodePlugin],
      tsconfig: tsconfig,
      ...(isESM
        ? {
            format: 'esm',
            target: 'esnext',
            mainFields: ['module', 'main'],
            banner: {
              js: [
                `import { createRequire as topLevelCreateRequire } from 'module';`,
                `global.require = global.require ?? topLevelCreateRequire(import.meta.url);`,
                `import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"`,
                `global.__dirname = global.__dirname ?? topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))`,
              ].join('\n'),
            },
          }
        : {
            format: 'cjs',
            target: 'node18',
          }),
      define: {
        // replace __dirname,... with the a variable that contains the file location
        __filename: '__fileloc.filename',
        __dirname: '__fileloc.dirname',
        __relativefilename: '__fileloc.relativefilename',
        __relativedirname: '__fileloc.relativedirname',
        'import.meta.url': '__fileloc.import.meta.url',
      },
    });
  } catch (error: any) {
    throw new Error(`Error building CDK code: ${error.message}`, {
      cause: error,
    });
  }
  return compileCodeFile;
}

/**
 * Determine if the project uses ES modules based on package.json configuration
 * @param entryFile - Path to the entry file
 * @returns True if the project uses ES modules, false otherwise
 */
async function isEsm(entryFile: string) {
  let isESM = false;
  const packageJsonPath = await findPackageJson(entryFile);

  if (packageJsonPath) {
    try {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, { encoding: 'utf-8' }),
      );
      if (packageJson.type === 'module') {
        isESM = true;
        Logger.verbose(`Using ES modules format`);
      }
    } catch (err: any) {
      Logger.error(
        `Error reading CDK package.json (${packageJsonPath}): ${err.message}`,
        err,
      );
    }
  }
  return isESM;
}

/**
 * Execute commands for Lambda bundles before or after bundling
 * @param lambdasBundle - Array of Lambda bundle configurations
 * @param commandPick - Which command to execute ('commandBeforeBundling' or 'commandAfterBundling')
 */
async function executeCommands(
  lambdasBundle: LambdaBundle[],
  commandPick: 'commandBeforeBundling' | 'commandAfterBundling',
) {
  // Filter bundles that have the specified command
  const commandsToExecute = lambdasBundle.filter(
    (lambdasEsBuildCommand) => lambdasEsBuildCommand[commandPick],
  );

  if (commandsToExecute.length === 0) {
    Logger.verbose(`No commands to execute for ${commandPick}, skipping`);
    return;
  }

  // Execute all commands in parallel
  const promises = commandsToExecute.map(async (lambdasEsBuildCommand) => {
    let command = lambdasEsBuildCommand[commandPick]!;
    const environment = lambdasEsBuildCommand.environment;
    const projectRoot = lambdasEsBuildCommand.projectRoot;

    // Remove '-building' suffix from paths in commands
    command = command.replaceAll('-building', '');

    Logger.verbose(
      `Executing command for ${lambdasEsBuildCommand.entryPoint}: ${command}`,
    );

    const osPlatform = os.platform();

    try {
      const { stdout, stderr } = await spawnAsync(
        osPlatform === 'win32' ? 'cmd' : 'bash',
        [osPlatform === 'win32' ? '/c' : '-c', command],
        {
          env: { ...process.env, ...environment },
          cwd: projectRoot ?? process.cwd(),
          windowsVerbatimArguments: osPlatform === 'win32',
        },
      );

      if (stdout) {
        Logger.log(`Command stdout: ${stdout}`);
      }
      if (stderr) {
        Logger.log(`Command stderr: ${stderr}`);
      }
    } catch (error: any) {
      throw new Error(
        `Command execution failed for ${lambdasEsBuildCommand.entryPoint}: ${error.message}`,
        { cause: error },
      );
    }
  });

  await Promise.all(promises);
  if (promises.length > 0) {
    Logger.log(
      `All ${commandPick === 'commandBeforeBundling' ? 'before bundling' : 'after bundling'} commands executed successfully`,
    );
  }
}

/**
 * Async wrapper for spawning child processes
 * @param command - The command to run
 * @param args - The arguments to pass to the command
 * @param options - Options to configure the child process
 * @returns A promise that resolves with the command output or rejects with an error
 */

export async function spawnAsync(
  command: string,
  args: string[] = [],
  options: Parameters<typeof spawn>[2] = {},
): Promise<{
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'pipe' });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Command failed with exit code ${code}: ${command} ${args.join(' ')}\nstderr: ${stderr}\nstdout: ${stdout}`,
          ),
        );
      } else {
        resolve({
          stdout,
          stderr,
        });
      }
    });
  });
}

/**
 * Run CDK code in a node worker thread and extract Lambda function configurations
 * This isolates the CDK execution to prevent interference with the main process
 * @param config - CDK Booster configuration
 * @param compileCodeFile - Path to the compiled CDK code file
 * @returns Array of Lambda function configurations found in the CDK code
 */
async function runCdkCodeAndReturnLambdas({
  config,
  compileCodeFile,
}: {
  config: CbConfig;
  compileCodeFile: string;
}) {
  Logger.verbose(
    `Running CDK code in worker thread to extract Lambda configurations`,
  );

  const workerResults: { lambdas: any[]; missing: boolean } = await new Promise(
    (resolve, reject) => {
      const workerPath = pathToFileURL(
        path.resolve(path.join(getModuleDirname(), 'cdkFrameworkWorker.mjs')),
      ).href;

      Logger.verbose(`Starting worker thread from: ${workerPath}`);

      const worker = new Worker(new URL(workerPath), {
        workerData: {
          verbose: config.verbose,
          projectDirname: getProjectDirname(),
          moduleDirname: getModuleDirname(),
        },
      });

      // Handle successful completion
      worker.on('message', async (message) => {
        Logger.verbose(
          `Worker completed successfully, found ${message.length} Lambda functions`,
        );
        resolve(message);
        await worker.terminate();
      });

      // Handle worker errors
      worker.on('error', (error: any) => {
        Logger.error(`Worker error: ${error.message}`, error);
        reject(
          new Error(`Error running CDK code in worker: ${error.message}`, {
            cause: error,
          }),
        );
      });

      // Handle worker exit
      // worker.on('exit', (code) => {
      //   if (code !== 0) {
      //     const errorMessage = `CDK worker stopped with exit code ${code}`;
      //     Logger.error(`${errorMessage}`);
      //     reject(new Error(errorMessage));
      //   } else {
      //     Logger.verbose(`Worker exited successfully`);
      //   }
      // });

      // Forward worker stdout to main process
      // worker.stdout.on('data', (data: Buffer) => {
      //   Logger.log(data.toString().trim());
      // });

      // Forward worker stderr to main process
      // worker.stderr.on('data', (data: Buffer) => {
      //   Logger.verbose(data.toString().trim());
      // });

      // Send the compiled code file path to the worker for execution
      Logger.verbose(
        `Sending compiled code file to worker: ${compileCodeFile}`,
      );
      worker.postMessage({
        compileOutput: compileCodeFile,
      });
    },
  );

  Logger.verbose(
    `Successfully extracted ${workerResults.lambdas.length} Lambda function configurations from CDK code`,
  );

  const lambdas = workerResults.lambdas as {
    cdkPath: string;
    stackName: string;
    codePath?: string;
    code: {
      path?: string;
    };
    handler: string;
    packageJsonPath: string;
    bundling: BundlingOptions;
  }[];

  return { lambdas, missing: workerResults.missing };
}

/**
 * Recursively copies a folder from source to destination,
 * deleting the destination folder first.
 * @param src - The source folder path
 * @param dest - The destination folder path
 * @param entryOutputFilename - The expected output filename pattern for fixing extensions
 */
async function copyFolderRecursive(
  src: string,
  dest: string,
  entryOutputFilename: string,
): Promise<void> {
  if (!existsSync(dest)) {
    await fs.mkdir(dest, { recursive: true });
  }

  const entries = await fs.readdir(src, { withFileTypes: true });
  const entryDir = path.dirname(entryOutputFilename);
  const entryBasename = path.basename(
    entryOutputFilename,
    path.extname(entryOutputFilename),
  );
  const entryExt = path.extname(entryOutputFilename);

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    // Fix extension if destPath matches entryOutputFilename pattern but has different extension
    const destBasename = path.basename(destPath, path.extname(destPath));
    if (
      path.dirname(destPath) === entryDir &&
      destBasename === entryBasename &&
      path.extname(destPath) !== entryExt
    ) {
      const srcExt = path.extname(srcPath);
      const fixedExt = srcExt.endsWith('.map') ? `${entryExt}.map` : entryExt;
      destPath = path.join(entryDir, `${entryBasename}${fixedExt}`);

      Logger.verbose(
        `Fixing extension from ${srcExt} to ${fixedExt}, destPath: ${destPath}`,
      );
    }

    if (entry.isDirectory()) {
      await copyFolderRecursive(srcPath, destPath, entryOutputFilename);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export function getModuleRoot(moduleName: string): string {
  const require = createRequire(import.meta.url);
  const modulePath = require.resolve(moduleName);
  let dir = dirname(modulePath);

  while (!existsSync(resolve(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) break; // Reached filesystem root
    dir = parent;
  }

  return dir;
}

export function getProjectRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));

  while (!existsSync(resolve(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) break; // Reached filesystem root
    dir = parent;
  }

  return dir;
}

run().catch((error) => {
  Logger.error(error);
  process.exit(1);
});
