import {
    buildRoster,
    isWcSensei,
    WcRosterRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { randomBytes } from 'crypto';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
} from '../directoryService/api';
import { listRoster, ok, saveSensei } from './database';

/** More guests than this is almost certainly a mistake, and crowds the bar. */
const MAX_GUESTS = 9;

/**
 * PUT /wc-live/roster: senseis add, change and remove guests, and switch any
 * sensei on or off or recolor them. Returns the roster after the change.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { username } = requireUserInfo(event);
        if (!isWcSensei(username)) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'Only senseis can change the bar',
            });
        }
        const request = parseBody(event, WcRosterRequestSchema);
        const saved = await listRoster();
        const roster = buildRoster(saved);
        const now = new Date().toISOString();

        if (request.action === 'add') {
            if (roster.filter((s) => s.guest).length >= MAX_GUESTS) {
                throw new ApiError({
                    statusCode: 400,
                    publicMessage: `There can be at most ${MAX_GUESTS} guest senseis`,
                });
            }
            await saveSensei({
                id: `guest-${randomBytes(4).toString('hex')}`,
                name: request.name,
                color: request.color,
                active: true,
                guest: true,
                addedAt: now,
            });
        } else {
            const current = roster.find((s) => s.id === request.id);
            if (!current) {
                throw new ApiError({
                    statusCode: 404,
                    publicMessage: 'That sensei is not on the bar',
                });
            }
            const addedAt = saved.find((s) => s.id === current.id)?.addedAt;
            if (request.action === 'remove') {
                if (!current.guest) {
                    throw new ApiError({
                        statusCode: 400,
                        publicMessage:
                            'Only guest senseis can be removed. Switch others off instead.',
                    });
                }
                await saveSensei({ ...current, addedAt, removed: true });
            } else {
                if (request.name !== undefined && !current.guest) {
                    throw new ApiError({
                        statusCode: 400,
                        publicMessage: 'Only guest senseis can be renamed',
                    });
                }
                await saveSensei({
                    ...current,
                    addedAt,
                    name: request.name ?? current.name,
                    color: request.color ?? current.color,
                    active: request.active ?? current.active,
                });
            }
        }

        return ok({ roster: buildRoster(await listRoster()) });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
