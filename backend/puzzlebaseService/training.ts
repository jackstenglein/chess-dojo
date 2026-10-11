'use strict';

import {
    AttemptSubmissionSchema,
    pickTrainingPuzzles,
    toPuzzleAttempt,
    trainingTagSets,
    TrainRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import {
    averagesFromSums,
    DEFAULT_START_RATING,
    rateAttempt,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/scoring';
import { getNormalizedRating } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import {
    addToPuzzleSums,
    getMyVotes,
    getPuzzle,
    getPuzzleSums,
    getUser,
    listPuzzles,
    requireTrainingAccess,
} from './database';
import {
    addToSession,
    addToStats,
    getAttempt,
    getLastSeen,
    getMemberRating,
    putAttempt,
    putMemberRating,
} from './runsDatabase';

/** How far ahead of the server's clock a finish time can be before it is rejected, in ms. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * Handles requests for puzzles to train on. Until training is opened (PUZZLEBASE_TRAINING_OPEN),
 * only Puzzle Contributors and admins can train; after that any signed-in member can. Returns puzzles that match the request, a rating range and optionally one bucket
 * or theme. The ones the member has never attempted come first, in random order, then the ones
 * they attempted longest ago.
 */
export const trainHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const { username } = requireUserInfo(event);
        await requireTrainingAccess(username);
        const request = parseEvent(event, TrainRequestSchema);
        const [puzzles, lastSeen, votes] = await Promise.all([
            listPuzzles(),
            getLastSeen(username),
            getMyVotes(username),
        ]);
        // Each puzzle carries the member's own vote on it, so they can see it and change it.
        return success(
            pickTrainingPuzzles(puzzles, request, Math.random, lastSeen).map((puzzle) =>
                votes[puzzle.id] ? { ...puzzle, myVote: votes[puzzle.id] } : puzzle,
            ),
        );
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles requests for the tags the puzzles have, so the screen where a member chooses what to train
 * on only offers what there are puzzles for. Whoever can train can ask. Nothing about a puzzle is
 * given away beyond its tags.
 */
export const trainingTagsHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const { username } = requireUserInfo(event);
        await requireTrainingAccess(username);
        return success(trainingTagSets(await listPuzzles()));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles requests to record an attempt at a puzzle: every move tried, wrong ones too, and the
 * time for each. Any signed-in member can. The server looks up the puzzle's rating and tags itself
 * rather than trusting the client, and works out the result. Sending the same attempt twice
 * records it once.
 */
export const submitAttemptHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const { username } = requireUserInfo(event);
        await requireTrainingAccess(username);
        const submission = parseBody(event, AttemptSubmissionSchema);

        if (Date.parse(submission.finishedAt) > Date.now() + CLOCK_SKEW_MS) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'The attempt finishes in the future. Check your device clock.',
            });
        }

        const puzzle = await getPuzzle(submission.puzzleId);
        if (!puzzle) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: `Puzzle ${submission.puzzleId} not found`,
            });
        }

        const user = await getUser(username);
        const ratingNow = user.ratings?.[user.ratingSystem]?.currentRating;
        const anchor =
            ratingNow && ratingNow > 0
                ? getNormalizedRating(ratingNow, user.ratingSystem)
                : undefined;

        const [member, lastSeen] = await Promise.all([
            getMemberRating(username),
            getLastSeen(username),
        ]);
        const { scoring, member: updated } = rateAttempt({
            attempt: submission,
            puzzle,
            firstAttempt: !(submission.puzzleId in lastSeen),
            member,
            anchor,
        });
        const attempt = { ...toPuzzleAttempt(submission, puzzle), scoring };

        if (await putAttempt(username, attempt)) {
            await addToSession(username, attempt);
            await addToStats(username, attempt);
            if (scoring.counted && !(await putMemberRating(username, updated, member?.count))) {
                // Another puzzle finished at the same moment. The rating is still right to within
                // a few points, so say so in the log and carry on rather than failing the save.
                console.warn('Rating changed while saving an attempt for %s', username);
            }
            if (scoring.counted && !submission.abandoned) {
                // Add it to what members have done on the puzzle, and send back how members rated near
                // them do on average. The average is not stored with the attempt, so a resend is not
                // counted twice.
                const memberRating = scoring.ratingBefore ?? DEFAULT_START_RATING;
                await addToPuzzleSums(puzzle.id, memberRating, scoring);
                const average = averagesFromSums(await getPuzzleSums(puzzle.id, memberRating));
                return success(
                    average ? { ...attempt, scoring: { ...scoring, average } } : attempt,
                );
            }
        } else {
            // Sending the same attempt twice: answer with what was saved the first time.
            const saved = await getAttempt(username, attempt.finishedAt, attempt.puzzleId);
            return success(saved ?? attempt);
        }
        return success(attempt);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
