import { Handler } from 'aws-lambda';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { v4 as uuidv4 } from 'uuid';

const stsClient = new STSClient({});

export const lambdaHandler: Handler = async (event) => {
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
