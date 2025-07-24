const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs/promises');

const stsClient = new STSClient({});

exports.lambdaHandler = async (event) => {
  // check SDK works
  const command = new GetCallerIdentityCommand({});
  const identity = await stsClient.send(command);

  // check uuid works
  const uuid = uuidv4();

  // read all files in current directory
  const files = await fs.readdir('.');

  const fileReadPromises = files.map(async (file) => {
    const stats = await fs.stat(file);
    if (stats.isFile()) {
      const content = await fs.readFile(file, 'utf8');
      return [file, content];
    }
    return null;
  });

  const fileResults = await Promise.all(fileReadPromises);
  const fileContents = Object.fromEntries(
    fileResults.filter((result) => result !== null),
  );

  const response = {
    inputEvent: event,
    accountId: identity.Account,
    testExternalLib: uuid,
    allFiles: fileContents,
  };

  return response;
};
