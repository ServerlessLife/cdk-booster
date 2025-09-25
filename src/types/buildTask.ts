import { BundleSettings } from './bundleSettings.js';

export type BuildTask = {
  buildOptions: BundleSettings;
  entryPoint: string;
};
