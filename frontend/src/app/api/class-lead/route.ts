import { classLeadSchema } from '@/app/[locale]/class/classLead';
import { logger } from '@/logging/logger';
import { NextResponse } from 'next/server';

const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * Forwards a /class email sign up to the email tool. CLASS_LEAD_WEBHOOK_URL points
 * at whichever tool the team picks, so the page doesn't depend on one vendor.
 */
export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const parsed = classLeadSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const webhookUrl = process.env.CLASS_LEAD_WEBHOOK_URL;
    if (!webhookUrl) {
        logger.error?.('CLASS_LEAD_WEBHOOK_URL is not set. Lead was not stored.');
        return NextResponse.json({ stored: false });
    }

    const { website: _website, ...lead } = parsed.data;
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...lead, createdAt: new Date().toISOString() }),
            signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        });
        if (!response.ok) {
            logger.error?.(`Class lead webhook returned ${response.status}`);
            return NextResponse.json({ stored: false });
        }
    } catch (error) {
        logger.error?.('Class lead webhook failed', error);
        return NextResponse.json({ stored: false });
    }

    return NextResponse.json({ stored: true });
}
