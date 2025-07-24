/**
 * CDK JSON Modifier Script
 *
 * This script modifies the "app" property in a cdk.json file.
 *
 * Usage:
 *   npx ts-node modify-cdk-json.ts <path-to-cdk.json> <new-app-value>
 *   or
 *   node dist/modify-cdk-json.js <path-to-cdk.json> <new-app-value>
 *
 * Parameters:
 *   path-to-cdk.json : Path to the cdk.json file to modify
 *   new-app-value    : New value for the "app" property
 *
 * Examples:
 *   npx ts-node modify-cdk-json.ts test/cdk-basic/cdk.json "node ../../dist/cdkbooster.mjs bin/cdk-basic.ts"
 *   npx ts-node modify-cdk-json.ts ./cdk.json "npm run start"
 *   npx ts-node modify-cdk-json.ts /path/to/project/cdk.json "npx ts-node bin/app.ts"
 *
 * The script will:
 * 1. Read the existing cdk.json file
 * 2. Parse the JSON content
 * 3. Update the "app" property with the new value
 * 4. Write the modified JSON back to the file with proper formatting
 */

import * as fs from 'fs';
import * as path from 'path';

interface CdkConfig {
  app: string;
  watch?: {
    include?: string[];
    exclude?: string[];
  };
  context?: Record<string, any>;
  [key: string]: any;
}

interface ModifyResult {
  success: boolean;
  originalValue: string;
  newValue: string;
  filePath: string;
}

/**
 * Modifies the app property in a cdk.json file
 * @param filePath - Path to the cdk.json file
 * @param newAppValue - New value for the app property
 * @returns modification result
 */
function modifyCdkJson(filePath: string, newAppValue: string): ModifyResult {
  try {
    // Validate input parameters
    if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
      throw new Error('File path must be a non-empty string');
    }

    if (
      !newAppValue ||
      typeof newAppValue !== 'string' ||
      !newAppValue.trim()
    ) {
      throw new Error('App value must be a non-empty string');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read and parse the cdk.json file
    const fileContent: string = fs.readFileSync(filePath, 'utf8');

    let cdkConfig: CdkConfig;

    try {
      cdkConfig = JSON.parse(fileContent) as CdkConfig;
    } catch (parseError: any) {
      throw new Error(
        `Invalid JSON in file ${filePath}: ${parseError.message}`,
      );
    }

    // Validate that cdkConfig is an object and has required structure
    if (!cdkConfig || typeof cdkConfig !== 'object') {
      throw new Error('CDK configuration must be a valid JSON object');
    }

    // Store original app value for logging
    const originalAppValue: string = cdkConfig.app || 'undefined';

    // Update the app property
    cdkConfig.app = newAppValue;

    // Write the modified JSON back to file with proper formatting
    const modifiedContent: string = JSON.stringify(cdkConfig, null, 2);
    fs.writeFileSync(filePath, modifiedContent, 'utf8');

    // Simple success message
    console.log(`Modified ${filePath}: app = "${newAppValue}"`);

    return {
      success: true,
      originalValue: originalAppValue,
      newValue: newAppValue,
      filePath,
    };
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Main function to handle command line execution
 */
function main(): void {
  // Get command line arguments
  const args: string[] = process.argv.slice(2);

  // Check if correct number of arguments provided
  if (args.length !== 2) {
    console.log(
      'Usage: npx ts-node modify-cdk-json.ts <path-to-cdk.json> <new-app-value>',
    );
    console.log('');
    console.log('Examples:');
    console.log(
      '  npx ts-node modify-cdk-json.ts test/cdk-basic/cdk.json "node ../../dist/cdkbooster.mjs bin/cdk-basic.ts"',
    );
    console.log('  npx ts-node modify-cdk-json.ts ./cdk.json "npm run start"');
    process.exit(1);
  }

  const [filePath, newAppValue]: [string, string] = args as [string, string];

  // Resolve relative path to absolute path
  const absoluteFilePath: string = path.resolve(filePath);

  modifyCdkJson(absoluteFilePath, newAppValue);
}

// Run the script if called directly
main();
