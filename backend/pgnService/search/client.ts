import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

let client: Client | undefined;

/** Returns the name of the search index for the current stage. */
export function gamesIndex(): string {
    return `${process.env.stage}-games`;
}

/**
 * Returns true if game search is configured for this deployment. Simple
 * deployments have no search domain and leave gameSearchEndpoint as the
 * 'unset' placeholder (CloudFormation outputs cannot be empty strings).
 */
export function isSearchEnabled(): boolean {
    const endpoint = process.env.gameSearchEndpoint;
    return !!endpoint && endpoint !== 'unset';
}

/**
 * Returns a memoized OpenSearch client for the endpoint in the
 * gameSearchEndpoint env var. Local http endpoints get a plain client;
 * anything else is signed with SigV4 (AWS domain).
 */
export function getClient(): Client {
    if (client) {
        return client;
    }

    const endpoint = process.env.gameSearchEndpoint;
    if (!endpoint || endpoint === 'unset') {
        throw new Error('gameSearchEndpoint is not configured');
    }

    if (endpoint.startsWith('http://')) {
        client = new Client({ node: endpoint });
    } else {
        client = new Client({
            ...AwsSigv4Signer({
                region: 'us-east-1',
                service: 'es',
                getCredentials: () => defaultProvider()(),
            }),
            node: endpoint,
        });
    }
    return client;
}
