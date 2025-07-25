const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { v4: uuidv4 } = require('uuid');

const stsClient = new STSClient({});

exports.lambdaHandler = async () => {
  // check SDK works
  const command = new GetCallerIdentityCommand({});
  const identity = await stsClient.send(command);

  // check uuid works
  const uuid = uuidv4();

  const response = {
    accountId: identity.Account,
    testExternalLib: !!uuid,
  };

  return response;
};
