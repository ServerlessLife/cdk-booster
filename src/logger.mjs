import chalk from 'chalk';
let verboseEnabled = false;
const logPrefix = '[🚀 CDK Booster]';
/**
 * Log a message
 * @param args The arguments to log
 */
function log(...args) {
  args = [logPrefix, ...args].map((arg) => {
    if (typeof arg === 'string') {
      // Regular expression to find text within square brackets
      return arg.replace(/\[(.*?)\]/g, (match) => chalk.gray(match)); // Colorizes the entire bracketed content
    }
    return arg;
  });
  console.log(...args);
}
/**
 * Log an important message
 * @param args The arguments to log
 */
function important(...args) {
  args = [logPrefix, ...args].map((arg) =>
    typeof arg === 'string' ? chalk.yellow(arg) : arg,
  );
  console.log(...args);
}
/**
 * Log an error message in red
 * @param args The arguments to log
 */
function error(...args) {
  args = [logPrefix, ...args].map((arg) =>
    typeof arg === 'string' ? chalk.red(arg) : arg,
  );
  console.error(...args);
}
/**
 * Log a warning message in orange
 * @param args The arguments to log
 */
function warn(...args) {
  args = [logPrefix, ...args].map((arg) =>
    typeof arg === 'string' ? chalk.yellow(arg) : arg,
  );
  console.warn(...args);
}
/**
 * Log an info message in green
 * @param args The arguments to log
 */
function info(...args) {
  args = [logPrefix, ...args].map((arg) =>
    typeof arg === 'string' ? chalk.greenBright(arg) : arg,
  );
  console.info(...args);
}
/**
 * Log a verbose message if verbose is enabled. Log the message in grey.
 * @param args The arguments to log
 */
function verbose(...args) {
  if (verboseEnabled) {
    args = [logPrefix, ...args].map((arg) =>
      typeof arg === 'string' ? chalk.grey(arg) : arg,
    );
    console.info(...args);
  }
}
/**
 * Set the verbosity of logging
 * @param enabled Whether verbose logging should be enabled
 */
function setVerbose(enabled) {
  verboseEnabled = enabled;
}
/**
 * Check if verbose logging is enabled
 * @returns Whether verbose logging is enabled
 */
function isVerbose() {
  return verboseEnabled;
}
export const Logger = {
  log,
  error,
  warn,
  important,
  info,
  verbose,
  setVerbose,
  isVerbose,
};
