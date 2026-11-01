import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const validLead = {
    email: 'player@example.com',
    classId: 'logical-chess',
    consent: true,
    attribution: { utm_source: 'youtube' },
    website: '',
};

function request(body: unknown) {
    return new Request('http://localhost/api/class-lead', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

describe('POST /api/class-lead', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('forwards a valid lead to the webhook without the honeypot', async () => {
        vi.stubEnv('CLASS_LEAD_WEBHOOK_URL', 'https://hooks.example.com/lead');
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', fetchMock);

        const response = await POST(request(validLead));

        expect(await response.json()).toEqual({ stored: true });
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://hooks.example.com/lead');
        const sent = JSON.parse(init.body as string) as Record<string, unknown>;
        expect(sent.email).toBe(validLead.email);
        expect(sent.classId).toBe('logical-chess');
        expect(sent.attribution).toEqual({ utm_source: 'youtube' });
        expect(sent.website).toBeUndefined();
    });

    it('reports that nothing was stored when no webhook is configured', async () => {
        vi.stubEnv('CLASS_LEAD_WEBHOOK_URL', '');
        const response = await POST(request(validLead));
        expect(await response.json()).toEqual({ stored: false });
    });

    it('reports that nothing was stored when the webhook fails', async () => {
        vi.stubEnv('CLASS_LEAD_WEBHOOK_URL', 'https://hooks.example.com/lead');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
        const response = await POST(request(validLead));
        expect(await response.json()).toEqual({ stored: false });
    });

    it('rejects a lead without consent', async () => {
        const response = await POST(request({ ...validLead, consent: false }));
        expect(response.status).toBe(400);
    });

    it('rejects a filled honeypot', async () => {
        const response = await POST(request({ ...validLead, website: 'spam' }));
        expect(response.status).toBe(400);
    });
});
