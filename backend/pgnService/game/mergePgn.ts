import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Chess } from '@jackstenglein/chess';
import {
    PgnMergeRequest,
    PgnMergeSchema,
} from '@jackstenglein/chess-dojo-common/src/pgn/merge';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    getUserInfo,
    parseBody,
    success,
} from '../../directoryService/api';
import { dynamo, gamesTable } from './create';
import { recursiveMergeLine } from './mergeUtils';
import { Game } from './types';

/**
 * Lambda handler that merges a PGN into an existing game.
 * @param event The event that triggered the Lambda.
 * @returns The cohort and id of the updated game.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = getUserInfo(event);
        const request = parseBody(event, PgnMergeSchema);
        const source = new Chess({ pgn: request.pgn });
        const game = await getGame(request.cohort, request.id);

        if (game.owner !== userInfo.username) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'Permission denied: you are not the owner of this game',
            });
        }

        const target = new Chess({ pgn: game.pgn });
        const newPgn = mergePgn(source, target, request);
        await updateGame(request.cohort, request.id, newPgn);

        return success({ cohort: request.cohort, id: request.id });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Gets the game with the provided cohort and id. Only the owner and pgn fields
 * are returned.
 * @param cohort The cohort of the game.
 * @param id The id of the game.
 * @returns The owner and pgn fields of the game.
 */
async function getGame(cohort: string, id: string): Promise<Pick<Game, 'owner' | 'pgn'>> {
    const input = new GetItemCommand({
        Key: {
            cohort: { S: cohort },
            id: { S: id },
        },
        ProjectionExpression: '#owner, #pgn',
        ExpressionAttributeNames: {
            '#owner': 'owner',
            '#pgn': 'pgn',
        },
        TableName: gamesTable,
    });

    const response = await dynamo.send(input);
    if (!response.Item) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: `Game ${cohort}/${id} not found`,
        });
    }

    return unmarshall(response.Item) as Pick<Game, 'owner' | 'pgn'>;
}

/**
 * Sets the PGN in the game with the provided cohort and id. None of the PGN headers
 * can change as a result of the merge, so no other fields need to be updated.
 * @param cohort The cohort of the game.
 * @param id The id of the game.
 * @param pgn The PGN to set on the game.
 */
async function updateGame(cohort: string, id: string, pgn: string) {
    const input = new UpdateItemCommand({
        Key: {
            cohort: { S: cohort },
            id: { S: id },
        },
        UpdateExpression: 'set #pgn = :pgn, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
            '#pgn': 'pgn',
            '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
            ':pgn': { S: pgn },
            ':updatedAt': { S: new Date().toISOString() },
        },
        TableName: gamesTable,
        ReturnValues: 'NONE',
    });
    await dynamo.send(input);
}

/**
 * Merges the source Chess into the target Chess and returns the final target PGN.
 * @param source The source Chess to merge into the target.
 * @param target The target Chess to merge the source into.
 * @param request The merge options.
 * @returns The final target PGN.
 */
export function mergePgn(source: Chess, target: Chess, request: PgnMergeRequest): string {
    source.seek(null);
    target.seek(null);

    if (source.normalizedFen() !== target.normalizedFen()) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Unable to merge: the games do not start from the same position',
        });
    }

    const citation =
        request.citeSource && request.sourceCohort && request.sourceId
            ? { source, cohort: request.sourceCohort, id: request.sourceId }
            : undefined;

    recursiveMergeLine(source.history(), target, null, {
        commentMergeType: request.commentMergeType,
        nagMergeType: request.nagMergeType,
        drawableMergeType: request.drawableMergeType,
        citation,
    });
    return target.renderPgn();
}

