#!/usr/bin/env node

/**
 * CDK JSON Modifier Script
 *
 * This script modifies the "app" property in a cdk.json file.
 *
 * Usage:
 *   node modify-cdk-json.js <path-to-cdk.json> <new-app-value>
 *
 * Parameters:
 *   path-to-cdk.json : Path to the cdk.json file to modify
 *   new-app-value    : New value for the "app" property
 *
 * Examples:
 *   node modify-cdk-json.js test/cdk-basic/cdk.json "node ../../dist/cdkbooster.mjs bin/cdk-basic.ts"
 *   node modify-cdk-json.js ./cdk.json "npm run start"
 *   node modify-cdk-json.js /path/to/project/cdk.json "npx ts-node bin/app.ts"
 *
 * The script will:
 * 1. Read the existing cdk.json file
 * 2. Parse the JSON content
 * 3. Update the "app" property with the new value
 * 4. Write the modified JSON back to the file with proper formatting
 * 5. Create a backup of the original file (with .backup extension)
 */

const fs = require('fs');
const path = require('path');

function modifyCdkJson(filePath, newAppValue) {
  try {
    // Validate input parameters
    if (!filePath || !newAppValue) {
      throw new Error('Both file path and app value are required');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Create backup of original file
    const backupPath = filePath + '.backup';
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup created: ${backupPath}`);

    // Read and parse the cdk.json file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const cdkConfig = JSON.parse(fileContent);

    // Store original app value for logging
    const originalAppValue = cdkConfig.app;

    // Update the app property
    cdkConfig.app = newAppValue;

    // Write the modified JSON back to file with proper formatting
    const modifiedContent = JSON.stringify(cdkConfig, null, 2);
    fs.writeFileSync(filePath, modifiedContent, 'utf8');

    // Success message
    console.log('✅ CDK JSON file modified successfully!');
    console.log(`📁 File: ${filePath}`);
    console.log(`🔄 Changed app from: "${originalAppValue}"`);
    console.log(`🎯 Changed app to: "${newAppValue}"`);
  } catch (error) {
    console.error('❌ Error modifying cdk.json file:', error.message);
    process.exit(1);
  }
}

function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  // Check if correct number of arguments provided
  if (args.length !== 2) {
    console.log(
      'Usage: node modify-cdk-json.js <path-to-cdk.json> <new-app-value>',
    );
    console.log('');
    console.log('Examples:');
    console.log(
      '  node modify-cdk-json.js test/cdk-basic/cdk.json "node ../../dist/cdkbooster.mjs bin/cdk-basic.ts"',
    );
    console.log('  node modify-cdk-json.js ./cdk.json "npm run start"');
    process.exit(1);
  }

  const [filePath, newAppValue] = args;

  // Resolve relative path to absolute path
  const absoluteFilePath = path.resolve(filePath);

  modifyCdkJson(absoluteFilePath, newAppValue);
}

// Run the script if called directly
if (require.main === module) {
  main();
}

// Export function for use as module
module.exports = { modifyCdkJson };
