import { buildRoster, isWcSensei } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { WcInviteResetSchema, WcInvites } from '@jackstenglein/chess-dojo-common/src/wcLive/guests';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { randomBytes } from 'crypto';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
} from '../directoryService/api';
import { getInviteToken, listRoster, ok, setInviteToken } from './database';

function requireSensei(event: APIGatewayProxyEventV2): void {
    const { username } = requireUserInfo(event);
    if (!isWcSensei(username)) {
        throw new ApiError({
            statusCode: 403,
            publicMessage: 'Only senseis can share guest links',
        });
    }
}

/** A new random token for a guest link. */
export function newToken(): string {
    return randomBytes(18).toString('base64url');
}

async function guestIds(): Promise<string[]> {
    return buildRoster(await listRoster())
        .filter((s) => s.guest)
        .map((s) => s.id);
}

/**
 * GET /wc-live/invites: each guest's link token, for senseis to copy. A guest
 * without a link yet gets one here.
 */
export const list: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        requireSensei(event);
        const invites: WcInvites['invites'] = {};
        for (const id of await guestIds()) {
            let token = await getInviteToken(id);
            if (!token) {
                token = newToken();
                await setInviteToken(id, token);
            }
            invites[id] = token;
        }
        return ok({ invites } satisfies WcInvites);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** PUT /wc-live/invites: a new link for a guest. The old one stops working. */
export const reset: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        requireSensei(event);
        const { id } = parseBody(event, WcInviteResetSchema);
        if (!(await guestIds()).includes(id)) {
            throw new ApiError({ statusCode: 404, publicMessage: 'That guest is not on the bar' });
        }
        const token = newToken();
        await setInviteToken(id, token);
        return ok({ id, token });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
