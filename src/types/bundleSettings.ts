import * as esbuild from 'esbuild';

export type BundleSettings = Pick<
  esbuild.BuildOptions,
  | 'target'
  | 'format'
  | 'minify'
  | 'sourcemap'
  | 'sourcesContent'
  | 'external'
  | 'loader'
  | 'define'
  | 'logLevel'
  | 'keepNames'
  | 'tsconfig'
  | 'banner'
  | 'footer'
  | 'mainFields'
  | 'inject'
  // The following properties are covered by esbuildArgs
  // | 'alias'
  // | 'drop'
  // | 'pure'
  // | 'logOverride'
  // | 'outExtension'
> & {
  readonly esbuildArgs?: {
    [key: string]: string | boolean;
  };
};
