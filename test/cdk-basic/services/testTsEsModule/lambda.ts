import { Handler } from 'aws-lambda';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';

const stsClient = new STSClient({});

export const lambdaHandler: Handler = async (event) => {
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
