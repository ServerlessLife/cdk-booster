import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({});

export async function callLambda(lambdaName: any) {
  const { Payload } = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: lambdaName,
      Payload: JSON.stringify({ test: 'test' }),
    }),
  );

  const responseString = new TextDecoder().decode(Payload);
  const response = JSON.parse(responseString);
  return response;
}
