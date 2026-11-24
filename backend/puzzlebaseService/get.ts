'use strict';

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { z } from 'zod';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parsePathParameters,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { getPuzzle, getVoteCountsFor, requireContributor } from './database';

const getPuzzleRequestSchema = z.object({ id: z.string().min(1) });

/** Handles requests to get a single puzzle by id. The caller must be a Puzzle Contributor or an admin. */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        await requireContributor(requireUserInfo(event).username);
        const { id } = parsePathParameters(event, getPuzzleRequestSchema);

        const puzzle = await getPuzzle(id);
        if (!puzzle) {
            throw new ApiError({ statusCode: 404, publicMessage: `Puzzle ${id} not found` });
        }
        return success({ ...puzzle, ...(await getVoteCountsFor(id)) });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
