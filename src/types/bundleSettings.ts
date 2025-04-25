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
  | 'alias'
  | 'drop'
  | 'pure'
  | 'logOverride'
  | 'outExtension'
>;
