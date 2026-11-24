import { describe, expect, it, vi } from 'vitest';

// The service keeps its data in memory in these tests, as it does locally.
vi.hoisted(() => {
    process.env.WC_LIVE_STORE = 'memory';
});

import { WC_SENSEIS, WcSensei } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { currentTestRoundId } from '@jackstenglein/chess-dojo-common/src/wcLive/testGame';
import type {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { listEvals } from './database';
import * as guest from './guestAccess';
import * as invites from './invites';
import * as roster from './roster';

type Handler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;

const SENSEI = WC_SENSEIS[0].username;

async function call(
    handler: unknown,
    body?: unknown,
    username?: string,
): Promise<{ status: number; data: Record<string, unknown> }> {
    const event = {
        body: body === undefined ? undefined : JSON.stringify(body),
        pathParameters: {},
        requestContext: {
            authorizer: { jwt: { claims: username ? { 'cognito:username': username } : {} } },
        },
    } as unknown as APIGatewayProxyEventV2;
    const result = (await (handler as Handler)(event)) as APIGatewayProxyStructuredResultV2;
    return {
        status: result.statusCode ?? 200,
        data: JSON.parse((result.body as string | undefined) || '{}') as Record<string, unknown>,
    };
}

async function addGuest(name: string): Promise<WcSensei> {
    const { data } = await call(roster.handler, { action: 'add', name, color: '#00acc1' }, SENSEI);
    const guests = (data.roster as WcSensei[]).filter((s) => s.guest && s.name === name);
    return guests[guests.length - 1];
}

async function linkFor(id: string): Promise<string> {
    const { data } = await call(invites.list, undefined, SENSEI);
    return (data.invites as Record<string, string>)[id];
}

describe('guest links', () => {
    it('only senseis can see the links', async () => {
        expect((await call(invites.list, undefined, 'somefan')).status).toBe(403);
    });

    it('lets the guest set their own eval and use the analysis board', async () => {
        const g = await addGuest('Magnus');
        const token = await linkFor(g.id);
        expect(token).toMatch(/^[A-Za-z0-9_-]{24}$/);

        const me = await call(guest.me, { token });
        expect(me).toMatchObject({ status: 200, data: { id: g.id, name: 'Magnus' } });

        const roundId = currentTestRoundId(Date.now());
        const saved = await call(guest.putEval, { token, roundId, ply: 0, value: 0.74 });
        expect(saved).toMatchObject({
            status: 200,
            data: { senseiId: g.id, value: 0.7, updatedBy: g.id },
        });
        expect((await listEvals(roundId)).some((e) => e.senseiId === g.id)).toBe(true);

        const moved = await call(guest.putAnalysis, {
            token,
            request: { action: 'move', roundId, path: ['d4'] },
        });
        expect(moved.status).toBe(200);
        expect(moved.data.cursor).toMatchObject({ path: ['d4'], by: g.id });

        const read = await call(guest.getAnalysisForGuest, { token, roundId });
        expect(read.status).toBe(200);
        expect(read.data.lines).toEqual([['d4']]);
    });

    it('cannot score anyone else', async () => {
        const g = await addGuest('Hikaru');
        const token = await linkFor(g.id);
        const roundId = currentTestRoundId(Date.now());
        // The guest eval request has no senseiId; one sent anyway is ignored.
        const saved = await call(guest.putEval, {
            token,
            roundId,
            ply: 0,
            value: 2,
            senseiId: SENSEI,
        });
        expect(saved.data.senseiId).toBe(g.id);
    });

    it('refuses a made-up token', async () => {
        const res = await call(guest.me, { token: 'A'.repeat(24) });
        expect(res.status).toBe(403);
    });

    it('turns the old link off when a sensei makes a new one', async () => {
        const g = await addGuest('Fabi');
        const old = await linkFor(g.id);
        const reset = await call(invites.reset, { id: g.id }, SENSEI);
        expect(reset.status).toBe(200);
        expect(reset.data.token).not.toBe(old);

        expect((await call(guest.me, { token: old })).status).toBe(403);
        expect((await call(guest.me, { token: reset.data.token })).status).toBe(200);
        // The list shows the new one.
        expect(await linkFor(g.id)).toBe(reset.data.token);
    });

    it('turns the link off when the guest is removed', async () => {
        const g = await addGuest('Ding');
        const token = await linkFor(g.id);
        await call(roster.handler, { action: 'remove', id: g.id }, SENSEI);
        expect((await call(guest.me, { token })).status).toBe(403);
    });
});
