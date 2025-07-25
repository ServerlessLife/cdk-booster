import { Handler } from 'aws-lambda';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { v4 as uuidv4 } from 'uuid';
import { readFile } from 'node:fs/promises';

const stsClient = new STSClient({});

export const lambdaHandler: Handler = async () => {
  // check SDK works
  const command = new GetCallerIdentityCommand({});
  const identity = await stsClient.send(command);

  // read the content of test.txt file
  const testFileContent = await readFile('test.txt', 'utf-8');

  // check uuid works
  const uuid = uuidv4();

  const response = {
    accountId: identity.Account,
    testExternalLib: !!uuid,
    testFileContent,
  };

  return response;
};
