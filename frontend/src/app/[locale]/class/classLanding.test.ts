import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    classLeadSchema,
    parseAttribution,
    savePendingCheckout,
    takePendingCheckout,
} from './classLead';
import { GAME_REVIEW_OFFER, totalValue, WORKSHOPS_OFFER } from './content';

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

describe('offer values', () => {
    it('adds up to the advertised totals', () => {
        expect(totalValue(WORKSHOPS_OFFER.items)).toBe(540);
        expect(totalValue(GAME_REVIEW_OFFER.items)).toBe(750);
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
