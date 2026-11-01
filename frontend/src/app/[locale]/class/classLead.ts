import { z } from 'zod';
import { ClassOfferTier } from './content';

const ACCESS_KEY = 'classLanding.access';
const ATTRIBUTION_KEY = 'classLanding.attribution';
const PENDING_CHECKOUT_KEY = 'classLanding.pendingCheckout';
const PENDING_CHECKOUT_TTL_MS = 60 * 60 * 1000;
const ATTRIBUTION_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
] as const;

export const classLeadSchema = z.object({
    email: z.email().max(254),
    classId: z.enum(['logical-chess', 'calculation', 'game-review']),
    consent: z.literal(true),
    attribution: z.record(z.string(), z.string().max(200)).optional(),
    /** Honeypot field. Hidden from people, so only bots fill it in. */
    website: z.string().max(0).optional(),
});

export type ClassLead = z.infer<typeof classLeadSchema>;

export interface PendingCheckout {
    tier: ClassOfferTier;
    interval: 'month' | 'year';
    createdAt: number;
}

function read(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key: string, value: string) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Private windows can block storage. The page still works for this visit.
    }
}

export function hasClassAccess(): boolean {
    return read(ACCESS_KEY) !== null;
}

export function grantClassAccess() {
    write(ACCESS_KEY, new Date().toISOString());
}

/** Keeps the first campaign that brought this visitor, so later visits don't overwrite it. */
export function rememberAttribution(search: string) {
    if (read(ATTRIBUTION_KEY)) {
        return;
    }
    const attribution = parseAttribution(search);
    if (Object.keys(attribution).length > 0) {
        write(ATTRIBUTION_KEY, JSON.stringify(attribution));
    }
}

export function parseAttribution(search: string): Record<string, string> {
    const params = new URLSearchParams(search);
    const attribution: Record<string, string> = {};
    for (const key of ATTRIBUTION_PARAMS) {
        const value = params.get(key);
        if (value) {
            attribution[key] = value.slice(0, 200);
        }
    }
    return attribution;
}

export function getAttribution(): Record<string, string> {
    try {
        return JSON.parse(read(ATTRIBUTION_KEY) ?? '{}') as Record<string, string>;
    } catch {
        return {};
    }
}

/** Remembers the plan a logged-out buyer chose, so checkout can resume after sign up. */
export function savePendingCheckout(tier: ClassOfferTier, interval: 'month' | 'year') {
    const pending: PendingCheckout = { tier, interval, createdAt: Date.now() };
    write(PENDING_CHECKOUT_KEY, JSON.stringify(pending));
}

export function takePendingCheckout(now = Date.now()): PendingCheckout | undefined {
    const raw = read(PENDING_CHECKOUT_KEY);
    if (!raw) {
        return undefined;
    }
    try {
        window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
        const pending = JSON.parse(raw) as PendingCheckout;
        return now - pending.createdAt < PENDING_CHECKOUT_TTL_MS ? pending : undefined;
    } catch {
        return undefined;
    }
}
