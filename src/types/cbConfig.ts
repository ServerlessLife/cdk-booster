export type CbConfig = {
  /**
   * Verbose logging
   * @default false
   */
  verbose?: boolean;

  /** Number of Lambdas bundled in a batch with ESBuild
   */
  batch?: number;

  /** Number of parallel ESBuild processes
   */
  parallel?: number;

  /**
   * Path to tsconfig.json file for bundling CDK code
   */
  tsconfig?: string;

  /**
   * Entry file
   */
  entryFile: string;
};
