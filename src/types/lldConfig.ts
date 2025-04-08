export type LldConfigBase = {
  /**
   * Verbose logging
   * @default false
   */
  verbose?: boolean;
};
export type LldConfigCliArgs = {} & LldConfigBase;

export type LldConfigTs = Partial<LldConfigBase>;

export type LldConfig = LldConfigCliArgs & LldConfigTs;
