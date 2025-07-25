import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { outputFolder } from './constants.js';
import { findPackageJson } from './utils/findPackageJson.js';
import { CbConfig } from './types/cbConfig.js';
import { Logger } from './logger.js';
import { Worker } from 'node:worker_threads';
import { getModuleDirname, getProjectDirname } from './getDirname.js';
import { type BundlingOptions } from 'aws-cdk-lib/aws-lambda-nodejs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { LambdaBundle } from './types/lambdaBundle.js';
import { BundleSettings } from './types/bundleSettings.js';
import crypto from 'node:crypto';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);

/**
 * Get Lambda functions
 * @param config Configuration
 * @returns Lambda functions
 */
async function prebuild(config: CbConfig) {
  await deleteFolderIfExists(path.resolve('cdk.out'));

  const lambdasInCdk = await getLambdasDataFromCdkByCompilingAndRunning(config);
  Logger.verbose(
    `[CDK] Found Lambda functions:`,
    JSON.stringify(lambdasInCdk, null, 2),
  );
}

/**
 * Get Lambdas data from CDK by compiling and running the CDK code
 * @param cdkConfigPath
 * @param config
 * @returns
 */
async function getLambdasDataFromCdkByCompilingAndRunning(config: CbConfig) {
  let isESM = false;
  const packageJsonPath = await findPackageJson(config.entryFile);

  if (packageJsonPath) {
    try {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, { encoding: 'utf-8' }),
      );
      if (packageJson.type === 'module') {
        isESM = true;
        Logger.verbose(`[CDK] Using ESM format`);
      }
    } catch (err: any) {
      Logger.error(
        `Error reading CDK package.json (${packageJsonPath}): ${err.message}`,
        err,
      );
    }
  }

  const rootDir = process.cwd();

  // Plugin that:
  // - Fixes __dirname issues
  // - Injects code to get the file path of the Lambda function and CDK hierarchy
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

        // Inject code to get the file path of the Lambda function and CDK hierarchy
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
          contents = contents.replace(
            codeToFind,
            codeToFind +
              `;
              if (process.env.CDK_BOOSTER_INSPECT === 'true') {
                if (!options.outputDir.startsWith('/asset-output')) {
                  global.lambdas = global.lambdas ?? [];

                  const out = pathJoin(options.outputDir,outFile);

                  const lambdaInfo = {
                    //outfile: out,
                    //inputDir: options.inputDir,
                    //options: options,
                    //props: this.props,
                    //outfile,
                    command: command,
                    entryPoint: relativeEntryPath,
                    out,
                    target: this.props.target ?? toTarget(this.props.runtime),
                    format: this.props.format,
                    minify: this.props.minify,
                    sourcemap: sourceMapValue,
                    sourcesContent,
                    external: this.externals,
                    loader: loaders,
                    define: defines,
                    logLevel: this.props.logLevel,
                    keepNames: this.props.keepNames,
                    tsconfig: this.relativeTsconfigPath ? pathJoin(options.inputDir, this.relativeTsconfigPath): undefined,
                    banner: this.props.banner,
                    footer: this.props.footer,
                    mainFields: this.props.mainFields,
                    inject: this.props.inject,
                    alias: this.props.esbuildArgs?.alias,
                    drop: this.props.esbuildArgs?.drop,
                    pure: this.props.esbuildArgs?.pure,
                    logOverride: this.props.esbuildArgs?.logOverride,
                    outExtension: this.props.esbuildArgs?.outExtension,
                    commandBeforeBundling: chain([...this.props.commandHooks?.beforeBundling(options.inputDir, options.outputDir) ?? [], tscCommand]),
                    commandAfterBundling: chain([...(this.props.nodeModules && this.props.commandHooks?.beforeInstall(options.inputDir, options.outputDir)) ?? [], depsCommand, ...this.props.commandHooks?.afterBundling(options.inputDir, options.outputDir) ?? []])
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

          // contents = contents.replace(
          //   'const sourceMapEnabled',
          //   'let sourceMapEnabled',
          // );

          const codeToFind3 =
            'return(0,util_1().exec)(osPlatform==="win32"?"cmd":"bash",[osPlatform==="win32"?"/c":"-c",localCommand],{env:{...process.env,...environment},stdio:["ignore",process.stderr,"inherit"],cwd,windowsVerbatimArguments:osPlatform==="win32"}),!0';
          contents = contents.replace(
            codeToFind3,
            `return (process.env.CDK_BOOSTER_INSPECT === 'true') ? true : (${codeToFind3.replace('return', '')})`,
          );
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
          const codeToFind = 'super(scope,id),this.requestDestinationArn=!1;';

          if (!contents.includes(codeToFind)) {
            throw new Error(`Can not find code to inject in ${args.path}`);
          }

          // Inject code to prevent deploying the assets
          contents = contents.replace(codeToFind, codeToFind + `return;`);
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
      entryPoints: [config.entryFile],
      bundle: true,
      platform: 'node',
      keepNames: true,
      outfile: compileCodeFile,
      sourcemap: false,
      plugins: [injectCodePlugin],
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

  const lambdas = await runCdkCodeAndReturnLambdas({
    config,
    compileCodeFile,
  });

  const lambdasEsBuildCommands = lambdas as any as Array<LambdaBundle>;

  // empty the output folder sequentially
  for (const lambdasEsBuildCommand of lambdasEsBuildCommands) {
    const entryOutputFilename = lambdasEsBuildCommand.out.replaceAll(
      '-building',
      '',
    );
    const target = path.dirname(entryOutputFilename);

    await deleteFolderIfExists(target);
    // create folder

    console.log(`Creating folder: ${target}`);
    await fs.mkdir(target, { recursive: true });
  }

  /*
   //empty the output folder
  await Promise.all(
    lambdasEsBuildCommands.map((lambdasEsBuildCommand) => async () => {
      const entryOutputFilename = lambdasEsBuildCommand.out.replaceAll(
        '-building',
        '',
      );
      const target = path.dirname(entryOutputFilename);

      await deleteFolderIfExists(target);
      // create folder
      await fs.mkdir(target, { recursive: true });
    }),
  );
  */

  await executeCommands(
    config,
    lambdasEsBuildCommands,
    'commandBeforeBundling',
  );

  const allBuildCombinations: {
    buildOptions: BundleSettings;
    entryPoint: string;
    buildOptionsHash: string;
  }[] = lambdasEsBuildCommands.map((lambdasEsBuildCommand) => {
    const copy: Partial<LambdaBundle> = {
      ...lambdasEsBuildCommand,
    };
    delete copy.outfile;
    delete copy.command;
    delete copy.entryPoint;
    delete copy.out;
    delete copy.commandBeforeBundling;
    delete copy.commandAfterBundling;

    const buildOptions: BundleSettings = copy;
    const entryPoint = lambdasEsBuildCommand.entryPoint;
    const buildOptionsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(buildOptions))
      .digest('hex');
    return {
      buildOptions,
      entryPoint,
      buildOptionsHash,
    };
  });

  const uniqueBuildhashes = new Set(
    allBuildCombinations.map((b) => b.buildOptionsHash),
  );

  const tempFolder = path.resolve(path.join(outputFolder, 'bundle'));

  let outputs: esbuild.Metafile['outputs'] = {};

  // const rootFolder = path.resolve(getModuleRoot('aws-cdk'), '../../');

  // console.log(`[CDK] Root folder: ${rootFolder}`);

  await Promise.all(
    Array.from(uniqueBuildhashes).map(async (buildHash) => {
      const buildCombinations = allBuildCombinations.filter(
        (b) => b.buildOptionsHash === buildHash,
      );

      const buildOptions = buildCombinations[0].buildOptions;
      const entryPoints = buildCombinations
        .filter((b) => b.buildOptionsHash === buildHash)
        .map((b) => b.entryPoint);

      // const outdir = path.join(
      //   outputFolder,
      //   'bundled',
      //   crypto.createHash('sha256').update(buildHash).digest('hex'),
      // );

      // // delete the output folder if it exists
      // await deleteFolderIfExists(outdir);

      const esBuildOpt: esbuild.BuildOptions = {
        entryPoints,
        bundle: true,
        platform: 'node',
        outdir: tempFolder,
        //...buildOptions,
        target: buildOptions.target,
        format: buildOptions.format,
        minify: buildOptions.minify,
        //sourcemap: true, //buildOptions.sourcemap, TODO FIX THIS
        sourcemap: buildOptions.sourcemap,
        sourcesContent: buildOptions.sourcesContent,
        external: buildOptions.external,
        //loader: buildOptions.loader,
        //define: buildOptions.define,
        logLevel: buildOptions.logLevel,
        keepNames: buildOptions.keepNames,
        tsconfig: buildOptions.tsconfig,
        banner: buildOptions.banner,
        footer: buildOptions.footer,
        mainFields: buildOptions.mainFields,
        inject: buildOptions.inject,
        alias: buildOptions.alias,
        drop: buildOptions.drop,
        pure: buildOptions.pure,
        logOverride: buildOptions.logOverride,
        //outExtension: buildOptions.outExtension,

        // target: 'node20',
        // sourcemap: true,
        // external: ['@aws-sdk/*'],
        entryNames: '[dir]/[name]-[hash]/index',
        metafile: true,
        outExtension: { '.js': '.mjs' },
        //absWorkingDir: path.resolve('../../'),
        //absWorkingDir: rootFolder,
      };

      console.log(
        `Boost building \n${entryPoints.join('\n -')} with options:`,
        JSON.stringify(esBuildOpt, null, 2),
      );

      const buildingResults = await esbuild.build(esBuildOpt);

      outputs = {
        ...outputs,
        ...buildingResults.metafile?.outputs,
      };
    }),
  );

  // const entryPoints = lambdasEsBuildCommands.map((l) => l.entryPoint);
  // const tempFolder = '.cdkbooster/bundle';

  // const buildingResults = await esbuild.build({
  //   entryPoints,
  //   bundle: true,
  //   target: 'node20',
  //   platform: 'node',
  //   outdir: tempFolder,
  //   sourcemap: true,
  //   external: ['@aws-sdk/*'],
  //   entryNames: '[dir]/[name]-[hash]/index',
  //   metafile: true,
  // });

  // if (!buildingResults.metafile) {
  //   throw new Error('No metafile found after building with esbuild');
  // }

  // move files to the output folder
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

      console.log(`Moving files from ${source} to ${target}...`);

      // create folder if it doesn't exist
      await copyFolderRecursive(source, target, entryOutputFilename);
    }),
  );

  await executeCommands(config, lambdasEsBuildCommands, 'commandAfterBundling');

  // regular import
  await import(pathToFileURL(compileCodeFile).href);
}

async function executeCommands(
  config: CbConfig,
  lambdasBundle: LambdaBundle[],
  commandPick: 'commandBeforeBundling' | 'commandAfterBundling',
) {
  const comandsToExecute = lambdasBundle.filter(
    (lambdasEsBuildCommand) => lambdasEsBuildCommand[commandPick],
  );

  if (comandsToExecute.length === 0) {
    Logger.verbose(
      `[CDK] No commands to execute for ${commandPick}, skipping...`,
    );
    return;
  } else {
    Logger.verbose(
      `[CDK] Found ${comandsToExecute.length} commands to execute for ${commandPick}: \n${comandsToExecute
        .map((lambdasEsBuildCommand) => lambdasEsBuildCommand[commandPick])
        .join('\n')}`,
    );
  }

  for (const lambdasEsBuildCommand of comandsToExecute) {
    let command = lambdasEsBuildCommand[commandPick]!;

    command = command.replaceAll('-building', '');
    console.log(
      `Executing command: \n${command} \nfor ${lambdasEsBuildCommand.entryPoint}`,
    );

    await execAsync(command);
    console.log(`Command executed successfully: \n${command}`);
  }

  /*

  const promises = comandsToExecute.map((lambdasEsBuildCommand) => async () => {
    let command = lambdasEsBuildCommand[commandPick]!;

    command = command.replaceAll('-building', '');
    console.log(
      `Executing command: \n${command} \nfor ${lambdasEsBuildCommand.entryPoint}`,
    );

    await execAsync(command);
    console.log(`Command executed successfully: \n${command}`);
  });
  await Promise.all(promises);
  */
}

/**
 * Run CDK code in a node thread worker and return the Lambda functions
 * @param param0
 * @returns
 */
async function runCdkCodeAndReturnLambdas({
  config,
  compileCodeFile,
}: {
  config: CbConfig;
  compileCodeFile: string;
}) {
  //process.chdir(getProjectDirname());
  //process.env.CDK_OUTDIR = 'cdk.out';

  /*
    await import(pathToFileURL(compileCodeFile).href);

    const lambdas = (global as any).lambdas;

    Logger.verbose(
      `[CDK] Found the following Lambda functions in the CDK code:`,
      JSON.stringify(lambdas, null, 2),
    );

    return lambdas;
    */

  const lambdas: any[] = await new Promise((resolve, reject) => {
    const workerPath = pathToFileURL(
      path.resolve(path.join(getModuleDirname(), 'cdkFrameworkWorker.mjs')),
    ).href;

    const worker = new Worker(new URL(workerPath), {
      workerData: {
        verbose: config.verbose,
        projectDirname: getProjectDirname(),
        moduleDirname: getModuleDirname(),
      },
    });

    worker.on('message', async (message) => {
      resolve(message);
      await worker.terminate();
    });

    worker.on('error', (error) => {
      reject(
        new Error(`Error running CDK code in worker: ${error.message}`, {
          cause: error,
        }),
      );
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`CDK worker stopped with exit code ${code}`));
      }
    });

    worker.stdout.on('data', (data: Buffer) => {
      Logger.log(`[CDK]`, data.toString());
    });

    worker.stderr.on('data', (data: Buffer) => {
      Logger.error(`[CDK]`, data.toString());
    });

    worker.postMessage({
      compileOutput: compileCodeFile,
    });
  });

  Logger.verbose(
    `[CDK] Found the following Lambda functions in the CDK code:`,
    JSON.stringify(lambdas, null, 2),
  );

  return lambdas as {
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
}

/**
 * Recursively deletes a folder if it exists.
 * @param folderPath - Path to the folder to delete
 */
async function deleteFolderIfExists(folderPath: string): Promise<void> {
  try {
    console.log(`Deleting folder: ${folderPath}`);

    await fs.rm(folderPath, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Warning: Couldn't delete ${folderPath}`, err);
  }
}

/**
 * Recursively copies a folder from source to destination,
 * deleting the destination folder first.
 * @param src - The source folder path
 * @param dest - The destination folder path
 */
async function copyFolderRecursive(
  src: string,
  dest: string,
  entryOutputFilename: string,
): Promise<void> {
  // Create destination directory
  if (!existsSync(dest)) {
    await fs.mkdir(dest, { recursive: true });
  }

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.resolve(path.join(src, entry.name));
    let destPath = path.resolve(path.join(dest, entry.name));

    // fixing mjs & cjs & js extension
    // if the destPath is the same as the entryOutputFilename, except extension make it the same

    const entryOutputFilenameWithoutExtension = path.join(
      path.dirname(entryOutputFilename),
      path.basename(entryOutputFilename, path.extname(entryOutputFilename)),
    );
    if (
      destPath.startsWith(entryOutputFilenameWithoutExtension) &&
      path.extname(destPath) !== path.extname(entryOutputFilename)
    ) {
      const sourceExtension = path.extname(srcPath);
      const destExtension = path.extname(entryOutputFilename);
      let fixedExtension: string;

      if (sourceExtension.endsWith('.map')) {
        fixedExtension = `${destExtension}.map`;
      } else {
        fixedExtension = destExtension;
      }

      destPath = `${entryOutputFilenameWithoutExtension}${fixedExtension}`;

      console.log(
        `Source extension: ${sourceExtension}, dest extension: ${destExtension} Fixing extension ${fixedExtension}, destPath: ${destPath}`,
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

export const CdkFramework = {
  prebuild,
};
