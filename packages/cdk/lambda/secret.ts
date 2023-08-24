import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const SECRET_ARN: string = process.env.SECRET_ARN!;
const secretsManager = new SecretsManagerClient({});

export const fetchOpenApiKey = async () => {
  const secretData = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: SECRET_ARN })
  );

  return secretData.SecretString!;
};
