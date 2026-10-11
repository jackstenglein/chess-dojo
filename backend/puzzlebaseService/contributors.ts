'use strict';

import {
    ApplyToContributeRequestSchema,
    ContributorProfileResponse,
    ContributorStatusResponse,
    LeaderboardEntry,
    PuzzlebaseContributor,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { z } from 'zod';
import {
    errToApiGatewayProxyResultV2,
    parseBody,
    parsePathParameters,
    requireUserInfo,
    success,
} from '../directoryService/api';
import {
    addContributor,
    approveContributor,
    createContributor,
    denyContributor,
    ensureAdminContributor,
    getContributor,
    getUser,
    listContributors,
    logAdminAction,
    requireAdmin,
    requireContributor,
    revokeContributor,
    trainingOpen,
} from './database';

/** The number of contributors shown on the leaderboard. */
const LEADERBOARD_SIZE = 10;

/**
 * Handles requests to apply to be a Puzzle Contributor. Anyone who is signed in can apply. Applying again
 * changes nothing and returns the existing application.
 */
export const applyHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseBody(event, ApplyToContributeRequestSchema);
        const user = await getUser(userInfo.username);

        const contributor: PuzzlebaseContributor = {
            username: user.username,
            displayName: user.displayName,
            status: 'PENDING',
            message: request.message,
            puzzleCount: 0,
            createdAt: new Date().toISOString(),
        };

        if (await createContributor(contributor)) {
            return success(contributor);
        }
        return success(await getContributor(user.username));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** Handles requests for the caller's own contributor status. */
export const meHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const [user, contributor] = await Promise.all([
            getUser(userInfo.username),
            getContributor(userInfo.username),
        ]);

        if (user.isAdmin && contributor?.role !== 'ADMIN') {
            await ensureAdminContributor(user);
        }
        const canContribute = user.isAdmin || contributor?.status === 'APPROVED';
        const response: ContributorStatusResponse = {
            canContribute,
            canTrain: canContribute || trainingOpen(),
            isAdmin: user.isAdmin,
            contributor,
        };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** Handles requests to list every contributor and application. The caller must be an admin. */
export const listHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        await requireAdmin(userInfo.username);

        const contributors = await listContributors();
        // Applications waiting for a decision first, then the most prolific contributors.
        contributors.sort((a, b) =>
            a.status === b.status ? b.puzzleCount - a.puzzleCount : a.status === 'PENDING' ? -1 : 1,
        );
        return success(contributors);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

const approveRequestSchema = z.object({ username: z.string().min(1) });

/** Handles requests to approve an application. The caller must be an admin. */
export const approveHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const admin = await requireAdmin(userInfo.username);
        const { username } = parsePathParameters(event, approveRequestSchema);

        const approved = await approveContributor(username);
        await logAdminAction(
            admin,
            'APPROVE_CONTRIBUTOR',
            `Approved ${username} as a Puzzle Contributor`,
        );
        return success(approved);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles requests to make someone a Puzzle Contributor without an application. The caller must be
 * an admin. The user must exist.
 */
export const addContributorHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const admin = await requireAdmin(userInfo.username);
        const { username } = parsePathParameters(event, approveRequestSchema);

        const user = await getUser(username);
        const contributor = await addContributor(user);
        await logAdminAction(
            admin,
            'ADD_CONTRIBUTOR',
            `Added ${user.username} as a Puzzle Contributor`,
        );
        return success(contributor);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** Handles requests to deny an application. The caller must be an admin. */
export const denyHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const admin = await requireAdmin(userInfo.username);
        const { username } = parsePathParameters(event, approveRequestSchema);

        const denied = await denyContributor(username);
        await logAdminAction(
            admin,
            'DENY_CONTRIBUTOR',
            `Denied ${username}'s application to be a Puzzle Contributor`,
        );
        return success(denied);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** Handles requests to take away a contributor's access. The caller must be an admin. */
export const revokeHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const admin = await requireAdmin(userInfo.username);
        const { username } = parsePathParameters(event, approveRequestSchema);

        const revoked = await revokeContributor(username);
        await logAdminAction(
            admin,
            'REVOKE_CONTRIBUTOR',
            `Removed ${username} as a Puzzle Contributor`,
        );
        return success(revoked);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles requests to check whether a user is a Puzzle Contributor, for the badge on their
 * profile. Public, and reveals only whether they are approved and how many puzzles they have
 * added, never who has applied.
 */
export const profileHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const { username } = parsePathParameters(event, approveRequestSchema);
        const contributor = await getContributor(username);

        const response: ContributorProfileResponse = {
            isContributor: contributor?.status === 'APPROVED',
            puzzleCount: contributor?.status === 'APPROVED' ? contributor.puzzleCount : 0,
        };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** Handles requests for the contributor leaderboard. The caller must be a Puzzle Contributor or an admin. */
export const leaderboardHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        await requireContributor(requireUserInfo(event).username);
        const leaderboard: LeaderboardEntry[] = (await listContributors())
            .filter((s) => s.status === 'APPROVED' && s.puzzleCount > 0)
            .sort((a, b) => b.puzzleCount - a.puzzleCount)
            .slice(0, LEADERBOARD_SIZE)
            .map(({ username, displayName, puzzleCount }) => ({
                username,
                displayName,
                puzzleCount,
            }));
        return success(leaderboard);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
