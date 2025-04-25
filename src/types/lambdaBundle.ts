import { BundleSettings } from './bundleSettings.js';

export type LambdaBundle = {
  outfile: string;
  command: string;
  entryPoint: string;
  out: string;

  // target: string | undefined;
  // format: string | undefined;
  // minify: string | undefined;
  // sourcemap: string | undefined;
  // sourcesContent: string | undefined;
  // external: string[] | undefined;
  // loader: string | undefined;
  // define: string | undefined;
  // logLevel: string | undefined;
  // keepNames: string | undefined;
  // tsconfig: string | undefined;
  // metafile: string | undefined;
  // banner: string | undefined;
  // footer: string | undefined;
  // mainFields: string | undefined;
  // inject: string | undefined;
  // esbuildArgs: string | undefined;

  commandBeforeBundling: string | undefined;
  commandAfterBundling: string | undefined;
} & BundleSettings;
