/**
 * Checks a CDK Booster log for double-bundling.
 *
 * Verifies that the line:
 *   "[🚀 CDK Booster] All functions have been bundled."
 * appears exactly once.
 *
 * Usage:
 *   node dist/check-cdk-bundling.js <path-to-log>
 *
 * Exit codes:
 *   0 = found exactly once (PASS)
 *   1 = found 0 times or >1 times (FAIL)
 *   2 = invalid usage or I/O error
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const TARGET_LINE = '[🚀 CDK Booster] All functions have been bundled.';

function usage(): void {
  const me = path.basename(process.argv[1] || 'check-double-prebundle');
  console.log(
    `Usage: ${me} <log-file>\nChecks that the target line appears exactly once.`,
  );
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] === '-h' || args[0] === '--help') {
    usage();
    process.exit(args.length === 1 ? 0 : 2);
  }

  const logPath = args[0];

  let text: string;
  try {
    text = fs.readFileSync(logPath, 'utf8');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: cannot read file "${logPath}": ${msg}`);
    process.exit(2);
  }

  // Simple, robust count of exact matches without regex escaping pitfalls
  const count = text.split(TARGET_LINE).length - 1;

  if (count === 1) {
    console.log(
      `✅ OK: Found the line "${TARGET_LINE}" exactly once in "${logPath}".`,
    );
    process.exit(0);
  } else if (count === 0) {
    console.error(
      `❌ FAIL: The line "${TARGET_LINE}" was not found in "${logPath}".`,
    );
    process.exit(1);
  } else {
    console.error(
      `❌ FAIL: The line "${TARGET_LINE}" appears ${count} times in "${logPath}" (expected exactly 1).`,
    );
    process.exit(1);
  }
}

main();
