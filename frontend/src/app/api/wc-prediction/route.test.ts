import { LOCK_AT_MS } from '@/app/[locale]/world-championship/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const validPrediction = {
    kind: 'prediction',
    email: 'player@example.com',
    displayName: 'Pat',
    consent: true,
    picks: {
        winner: 'gukesh',
        tiebreaks: false,
        score: '7.5-5.5',
        decisiveGames: 4,
        firstDecisiveGame: 3,
        game1Moves: 41,
    },
    attribution: { utm_source: 'youtube' },
    website: '',
};

const resultsSignup = {
    kind: 'results',
    email: 'fan@example.com',
    consent: true,
    website: '',
};

function request(body: unknown) {
    return new Request('http://localhost/api/wc-prediction', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

describe('POST /api/wc-prediction', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(LOCK_AT_MS - 60 * 60 * 1000);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('forwards a prediction as flat columns, without the honeypot', async () => {
        vi.stubEnv('WC_PREDICTION_WEBHOOK_URL', 'https://hooks.example.com/wc');
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', fetchMock);

        const response = await POST(request(validPrediction));

        expect(await response.json()).toEqual({ stored: true });
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://hooks.example.com/wc');
        const sent = JSON.parse(init.body as string) as Record<string, unknown>;
        expect(sent).toMatchObject({
            kind: 'prediction',
            email: 'player@example.com',
            displayName: 'Pat',
            winner: 'gukesh',
            tiebreaks: false,
            score: '7.5-5.5',
            decisiveGames: 4,
            firstDecisiveGame: 3,
            game1Moves: 41,
            attribution: { utm_source: 'youtube' },
        });
        expect(sent.createdAt).toBe(new Date(LOCK_AT_MS - 60 * 60 * 1000).toISOString());
        expect(sent.website).toBeUndefined();
    });

    it('refuses a prediction once Game 1 has started', async () => {
        vi.setSystemTime(LOCK_AT_MS);
        vi.stubEnv('WC_PREDICTION_WEBHOOK_URL', 'https://hooks.example.com/wc');
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const response = await POST(request(validPrediction));

        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({ error: 'closed' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('still takes a results sign up after the lock', async () => {
        vi.setSystemTime(LOCK_AT_MS + 24 * 60 * 60 * 1000);
        vi.stubEnv('WC_PREDICTION_WEBHOOK_URL', 'https://hooks.example.com/wc');
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', fetchMock);

        const response = await POST(request(resultsSignup));

        expect(await response.json()).toEqual({ stored: true });
        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(JSON.parse(init.body as string)).toMatchObject({
            kind: 'results',
            email: 'fan@example.com',
        });
    });

    it('reports that nothing was stored when no webhook is configured', async () => {
        vi.stubEnv('WC_PREDICTION_WEBHOOK_URL', '');
        const response = await POST(request(validPrediction));
        expect(await response.json()).toEqual({ stored: false });
    });

    it('reports that nothing was stored when the webhook fails', async () => {
        vi.stubEnv('WC_PREDICTION_WEBHOOK_URL', 'https://hooks.example.com/wc');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
        const response = await POST(request(validPrediction));
        expect(await response.json()).toEqual({ stored: false });
    });

    it('rejects picks that cannot all come true', async () => {
        const picks = { ...validPrediction.picks, decisiveGames: 0, firstDecisiveGame: 'none' };
        const response = await POST(request({ ...validPrediction, picks }));
        expect(response.status).toBe(400);
    });

    it('rejects an entry without consent', async () => {
        const response = await POST(request({ ...validPrediction, consent: false }));
        expect(response.status).toBe(400);
    });

    it('rejects a filled honeypot', async () => {
        const response = await POST(request({ ...validPrediction, website: 'spam' }));
        expect(response.status).toBe(400);
    });
});
