import { z } from 'zod';

// Not in use while LEAD_CAPTURE.ready is false: there is no /api/rush-lead on the site.
// Leads belong in the lead service, which needs a type for this page first.

/** What the unlock screen sends when a visitor asks for their code by email. */
export const rushLeadSchema = z.object({
    email: z.email().max(254),
    consent: z.literal(true),
    /** The visitor's best score across their runs. */
    bestScore: z.number().int().min(0).max(500),
    /** The score of each finished run, oldest first. */
    scores: z.array(z.number().int().min(0).max(500)).max(10).optional(),
    attribution: z.record(z.string(), z.string().max(200)).optional(),
    /** Honeypot field. Hidden from people, so only bots fill it in. */
    website: z.string().max(0).optional(),
});

export type RushLead = z.infer<typeof rushLeadSchema>;

/** Marks the lead for the email tool, which may share a webhook with /class. */
export const RUSH_LEAD_SOURCE = 'dojo-rush';

/**
 * Sends the lead to /api/rush-lead. Resolves to true only when the email tool took
 * it, so the page never tells a visitor a code is coming when nothing was stored.
 */
export async function submitRushLead(lead: RushLead): Promise<boolean> {
    try {
        const response = await fetch('/api/rush-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lead),
        });
        if (!response.ok) {
            return false;
        }
        const body = (await response.json()) as { stored?: boolean };
        return body.stored === true;
    } catch {
        return false;
    }
}
