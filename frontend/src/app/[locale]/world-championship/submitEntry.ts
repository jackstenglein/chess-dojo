import { WcEntry } from './prediction';

export type SubmitOutcome = 'stored' | 'closed' | 'failed';

/** Without a webhook the local dev server still lets the flow finish, so the page can be reviewed. */
const ACCEPT_UNSTORED = process.env.NODE_ENV === 'development';

/**
 * Sends a prediction or a results sign up to /api/wc-prediction. "stored" is only
 * returned when the entry really reached the sheet, because the page then tells
 * the visitor that their picks are in.
 */
export async function submitEntry(entry: WcEntry): Promise<SubmitOutcome> {
    try {
        const response = await fetch('/api/wc-prediction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
        });
        if (response.status === 409) {
            return 'closed';
        }
        if (!response.ok) {
            return 'failed';
        }
        const result = (await response.json()) as { stored?: boolean };
        return result.stored === true || ACCEPT_UNSTORED ? 'stored' : 'failed';
    } catch {
        return 'failed';
    }
}
