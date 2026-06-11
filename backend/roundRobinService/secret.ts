import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

/**
 * Fetches the secret with the provided name from AWS Secret Manager.
 * @param secretName The name of the secret to fetch.
 * @returns The secret with the provided name.
 */
export async function getSecret(secretName: string) {
    const client = new SecretsManagerClient();
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: secretName,
        }),
    );
    return response.SecretString;
}
