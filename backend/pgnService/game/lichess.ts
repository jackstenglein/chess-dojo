import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { LichessFetcher } from '@jackstenglein/chess-dojo-common/src/lichess/lichess';
import { ApiError } from '../../directoryService/api';

const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });
let lichessFetcher: LichessFetcher | undefined;

/**
 * Returns ChessDojo's Lichess API token, or undefined if it is not configured. Without it,
 * Lichess only exports games that are recent or between players rated 2200+ on average.
 */
async function getLichessFetcher(): Promise<LichessFetcher> {
    if (lichessFetcher) {
        return lichessFetcher;
    }

    const lichessToken = await secretsManager
        .send(
            new GetSecretValueCommand({
                SecretId: `chess-dojo-${process.env.stage}-lichessApiToken`,
            }),
        )
        .then((output) => output.SecretString || undefined)
        .catch((err: unknown) => {
            console.error('Failed to get the Lichess API token: ', err);
            return undefined;
        });

    lichessFetcher = new LichessFetcher(lichessToken);
    return lichessFetcher;
}

/**
 * Fetches the PGN of the given Lichess game.
 * @param url The URL of the Lichess game.
 * @returns The PGN of the Lichess game.
 */
export async function getLichessGame(url?: string): Promise<string> {
    const fetcher = await getLichessFetcher();
    const result = await fetcher.getLichessGame(url);
    if (result.error) {
        throw new ApiError({ ...result.error });
    }
    return result.data;
}

/**
 * Fetches the PGN of the given Lichess study chapter.
 * @param url The URL of the Lichess study chapter.
 * @returns The PGN of the chapter.
 */
export async function getLichessChapter(url?: string): Promise<string> {
    const fetcher = await getLichessFetcher();
    const result = await fetcher.getLichessChapter(url);
    if (result.error) {
        throw new ApiError({ ...result.error });
    }
    return result.data;
}

/**
 * Fetches a list of the PGNs in the given Lichess study.
 * @param url The URL of the Lichess study.
 * @returns A list of the PGNs in the study.
 */
export async function getLichessStudy(url?: string): Promise<string[]> {
    const fetcher = await getLichessFetcher();
    const result = await fetcher.getLichessStudy(url);
    if (result.error) {
        throw new ApiError({ ...result.error });
    }
    return result.data;
}
