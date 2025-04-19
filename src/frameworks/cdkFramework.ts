import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { outputFolder } from '../constants.js';
import { findPackageJson } from '../utils/findPackageJson.js';
import { LldConfigBase } from '../types/lldConfig.js';
import { Logger } from '../logger.js';
import { Worker } from 'node:worker_threads';
import { getModuleDirname, getProjectDirname } from '../getDirname.js';
import { findNpmPath } from '../utils/findNpmPath.js';
import { type BundlingOptions } from 'aws-cdk-lib/aws-lambda-nodejs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Support for AWS CDK framework
 */
export class CdkFramework {
  /**
   * Get Lambda functions
   * @param config Configuration
   * @returns Lambda functions
   */
  public async prebuild(config: LldConfigBase) {
    const cdkConfigPath = 'cdk.json';
    // read cdk.json and extract the entry file

    const lambdasInCdk = await this.getLambdasDataFromCdkByCompilingAndRunning(
      cdkConfigPath,
      config,
    );
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
  protected async getLambdasDataFromCdkByCompilingAndRunning(
    cdkConfigPath: string,
    config: LldConfigBase,
  ) {
    const entryFile = await this.getCdkEntryFile(cdkConfigPath);
    let isESM = false;
    const packageJsonPath = await findPackageJson(entryFile);

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
                    entryPoint: relativeEntryPath,
                    //outfile: out,
                    //inputDir: options.inputDir,
                    //options: options,
                    //props: this.props,
                    command: command,
                  };

                  global.lambdas.push(lambdaInfo);


                  const fs = require('fs');
                  const path = require('path');
                  const dir = path.dirname(out);
                  fs.mkdirSync(dir, { recursive: true });
                  fs.writeFileSync(out, '');
                }

                return command;
              }
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
        entryPoints: [entryFile],
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

    const context = await this.getCdkContext(cdkConfigPath);

    const CDK_CONTEXT_JSON = {
      ...context,
      // prevent compiling assets
      //'aws:cdk:bundling-stacks': [],
    };
    process.env.CDK_CONTEXT_JSON = JSON.stringify(CDK_CONTEXT_JSON);
    Logger.verbose(`[CDK] Context:`, JSON.stringify(CDK_CONTEXT_JSON, null, 2));

    const awsCdkLibPath = await findNpmPath(getProjectDirname(), 'aws-cdk-lib');
    Logger.verbose(`[CDK] aws-cdk-lib path: ${awsCdkLibPath}`);

    const lambdas = await this.runCdkCodeAndReturnLambdas({
      config,
      awsCdkLibPath,
      compileCodeFile,
    });

    const lambdasEsBuildCommands = lambdas as any as Array<{
      entryPoint: string;
      outfile: string;
      command: string;
      //inputDir: string;
    }>;
    await Promise.all(
      lambdasEsBuildCommands.map(async (lambdasEsBuildCommand) => {
        console.log(
          `************ BUNDLING ${lambdasEsBuildCommand.entryPoint} ****************`,
        );

        let command = lambdasEsBuildCommand.command;

        console.log(command);

        command = command.replaceAll('-building', '');
        await execAsync(command);
        console.log(
          `************ BUNDLING END ${lambdasEsBuildCommand.entryPoint} ************`,
        );
      }),
    );

    // regular import
    await import(pathToFileURL(compileCodeFile).href);
  }

  /**
   * Run CDK code in a node thread worker and return the Lambda functions
   * @param param0
   * @returns
   */
  protected async runCdkCodeAndReturnLambdas({
    config,
    awsCdkLibPath,
    compileCodeFile,
  }: {
    config: LldConfigBase;
    awsCdkLibPath: string | undefined;
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
        path.resolve(
          path.join(getModuleDirname(), 'frameworks/cdkFrameworkWorker.mjs'),
        ),
      ).href;

      const worker = new Worker(new URL(workerPath), {
        workerData: {
          verbose: config.verbose,
          awsCdkLibPath,
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
   * Get CDK context
   * @param cdkConfigPath
   * @param config
   * @returns
   */
  protected async getCdkContext(cdkConfigPath: string) {
    // get CDK context from the command line
    // get all "-c" and "--context" arguments from the command line

    // get all context from 'cdk.context.json' if it exists
    let contextFromJson = {};
    try {
      const cdkContextJson = await fs.readFile('cdk.context.json', 'utf8');
      contextFromJson = JSON.parse(cdkContextJson);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw new Error(`Error reading cdk.context.json: ${err.message}`);
      }
    }

    // get context from cdk.json
    let cdkJson: { context?: Record<string, string> } = {};
    try {
      cdkJson = JSON.parse(await fs.readFile(cdkConfigPath, 'utf8'));
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw new Error(`Error reading cdk.json: ${err.message}`);
      }
    }

    return { ...contextFromJson, ...cdkJson.context };
  }

  /**
   * Get CDK entry file
   * @param cdkConfigPath
   * @returns
   */
  async getCdkEntryFile(cdkConfigPath: string) {
    const cdkJson = await fs.readFile(cdkConfigPath, 'utf8');
    const cdkConfig = JSON.parse(cdkJson);
    const entry = cdkConfig.app as string | undefined;
    // just file that ends with .ts
    let entryFile = entry
      ?.split(' ')
      .find((file: string) => file.endsWith('.ts'))
      ?.trim();

    if (!entryFile) {
      throw new Error(`Entry file not found in ${cdkConfigPath}`);
    }

    entryFile = path.resolve(entryFile);
    Logger.verbose(`[CDK] Entry file: ${entryFile}`);

    return entryFile;
  }
}

export const cdkFramework = new CdkFramework();
