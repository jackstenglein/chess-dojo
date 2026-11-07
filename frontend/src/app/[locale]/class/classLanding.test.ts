import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    classLeadSchema,
    parseAttribution,
    savePendingCheckout,
    takePendingCheckout,
} from './classLead';
import {
    CORE_OFFER,
    GAME_REVIEW_OFFER,
    MAX_YEARLY_SAVING,
    offerForTier,
    WORKSHOPS_OFFER,
} from './content';

const validLead = {
    email: 'player@example.com',
    classId: 'calculation',
    consent: true,
};

describe('classLeadSchema', () => {
    it('accepts a complete lead', () => {
        expect(classLeadSchema.safeParse(validLead).success).toBe(true);
    });

    it('requires consent', () => {
        expect(classLeadSchema.safeParse({ ...validLead, consent: false }).success).toBe(false);
    });

    it('rejects an invalid email', () => {
        expect(classLeadSchema.safeParse({ ...validLead, email: 'nope' }).success).toBe(false);
    });

    it('rejects a filled honeypot', () => {
        expect(classLeadSchema.safeParse({ ...validLead, website: 'x' }).success).toBe(false);
    });
});

describe('parseAttribution', () => {
    it('keeps only utm params', () => {
        expect(parseAttribution('?utm_source=youtube&utm_content=pin&foo=bar')).toEqual({
            utm_source: 'youtube',
            utm_content: 'pin',
        });
    });
});

describe('offers', () => {
    it('shows the biggest yearly saving on the toggle', () => {
        expect(MAX_YEARLY_SAVING).toBe(240);
    });

    it('finds the offer for a saved tier', () => {
        expect(offerForTier(CORE_OFFER.tier)).toBe(CORE_OFFER);
        expect(offerForTier(GAME_REVIEW_OFFER.tier)).toBe(GAME_REVIEW_OFFER);
        expect(offerForTier(WORKSHOPS_OFFER.tier)).toBe(WORKSHOPS_OFFER);
    });
});

describe('pending checkout', () => {
    const store = new Map<string, string>();

    beforeEach(() => {
        store.clear();
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: {
                localStorage: {
                    getItem: (key: string) => store.get(key) ?? null,
                    setItem: (key: string, value: string) => store.set(key, value),
                    removeItem: (key: string) => store.delete(key),
                },
            },
        });
    });

    it('returns the saved plan once', () => {
        savePendingCheckout(SubscriptionTier.Lecture, 'year');
        expect(takePendingCheckout()?.interval).toBe('year');
        expect(takePendingCheckout()).toBeUndefined();
    });

    it('drops a stale plan', () => {
        savePendingCheckout(SubscriptionTier.Lecture, 'month');
        expect(takePendingCheckout(Date.now() + 2 * 60 * 60 * 1000)).toBeUndefined();
    });
});
