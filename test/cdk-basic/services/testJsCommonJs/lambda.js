const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { v4: uuidv4 } = require('uuid');
const { readFile } = require('fs/promises');

const stsClient = new STSClient({});

exports.lambdaHandler = async () => {
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
