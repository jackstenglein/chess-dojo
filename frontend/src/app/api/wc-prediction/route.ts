import { LOCK_AT_MS, LOCK_AT_UTC } from '@/app/[locale]/world-championship/config';
import { wcEntrySchema } from '@/app/[locale]/world-championship/prediction';
import { logger } from '@/logging/logger';
import { NextResponse } from 'next/server';

const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * Forwards a World Championship prediction, or a results sign up, to the sheet or
 * email tool behind WC_PREDICTION_WEBHOOK_URL. Predictions are refused once Game 1
 * has started, whatever the visitor's own clock says. Scoring happens in the sheet.
 */
export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const parsed = wcEntrySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { website: _website, ...entry } = parsed.data;
    if (entry.kind === 'prediction' && Date.now() >= LOCK_AT_MS) {
        return NextResponse.json({ error: 'closed', lockedAt: LOCK_AT_UTC }, { status: 409 });
    }

    const webhookUrl = process.env.WC_PREDICTION_WEBHOOK_URL;
    if (!webhookUrl) {
        logger.error?.('WC_PREDICTION_WEBHOOK_URL is not set. Entry was not stored.');
        return NextResponse.json({ stored: false });
    }

    // Picks are sent as flat columns so the sheet needs no parsing.
    const payload =
        entry.kind === 'prediction'
            ? {
                  kind: entry.kind,
                  email: entry.email,
                  displayName: entry.displayName ?? '',
                  consent: entry.consent,
                  ...entry.picks,
                  attribution: entry.attribution ?? {},
              }
            : {
                  kind: entry.kind,
                  email: entry.email,
                  consent: entry.consent,
                  attribution: entry.attribution ?? {},
              };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, createdAt: new Date().toISOString() }),
            signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        });
        if (!response.ok) {
            logger.error?.(`World Championship webhook returned ${response.status}`);
            return NextResponse.json({ stored: false });
        }
    } catch (error) {
        logger.error?.('World Championship webhook failed', error);
        return NextResponse.json({ stored: false });
    }

    return NextResponse.json({ stored: true });
}
