import { describe, expect, it } from 'vitest';
import * as config from './config';
import { LOCK_AT_MS, OFFER_OPTIONS, VENUE_TIME_ZONE } from './config';
import * as content from './content';
import { FAQ, HERO, META, RULES, SCORING } from './content';
import { MAX_POINTS } from './prediction';

/** Every string in the page copy, including what copy functions return. */
function collectStrings(value: unknown, found: string[] = []): string[] {
    if (typeof value === 'string') {
        found.push(value);
    } else if (typeof value === 'function') {
        found.push(String((value as (...args: unknown[]) => unknown)('X', 'Y')));
    } else if (Array.isArray(value)) {
        value.forEach((item) => collectStrings(item, found));
    } else if (value && typeof value === 'object') {
        Object.values(value).forEach((item) => collectStrings(item, found));
    }
    return found;
}

const copy = [
    ...collectStrings(content),
    ...collectStrings(config.PRIZES),
    ...collectStrings(OFFER_OPTIONS),
    config.BF_OFFER.endsLabel,
    config.BF_OFFER.earlyAccessLabel,
];

describe('page copy', () => {
    it('has no em dashes, exclamation points or unfilled placeholders', () => {
        expect(copy.length).toBeGreaterThan(80);
        for (const text of copy) {
            expect(text).not.toMatch(/[—!]/);
            expect(text).not.toMatch(/NEED|TODO|undefined|NaN/);
            expect(text.replace('{lock}', '')).not.toMatch(/[{}]/);
        }
    });

    it('promises nothing the program does not offer', () => {
        for (const text of copy) {
            expect(text).not.toMatch(/guarantee|free trial|refund|risk-free/i);
        }
    });

    it('states the lock time at the venue the same way the config does', () => {
        const parts = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
            timeZone: VENUE_TIME_ZONE,
        }).formatToParts(LOCK_AT_MS);
        const part = (type: string) => parts.find((item) => item.type === type)?.value;
        const date = `${part('month')} ${part('day')}`;

        expect(HERO.lockAtVenue).toBe(
            `${part('weekday')}, ${date} at ${part('hour')}:${part('minute')} in Geneva`,
        );
        expect(HERO.eyebrow).toContain(`Game 1 on ${date}`);
        expect(META.description).toContain(`Game 1 on ${date}`);
    });

    it('keeps the scoring table in step with the scoring code', () => {
        const total = SCORING.rows.reduce((sum, row) => sum + Number(row.points), 0);
        expect(total).toBe(MAX_POINTS);
        expect(SCORING.maximum).toBe(String(MAX_POINTS));
        expect(SCORING.rows).toHaveLength(5);
    });

    it('marks the answers that wait on a decision', () => {
        expect(FAQ.filter((item) => item.needsEligibility).map((item) => item.question)).toEqual([
            'Who can enter?',
        ]);
        expect(RULES.items.filter((item) => item.needsPrizes)).toHaveLength(2);
        expect(RULES.items.at(-1)?.text).toBe(content.NOT_AFFILIATED);
    });
});

describe('sentences', () => {
    it('gives each sentence of a heading its own line', () => {
        expect(content.sentences(HERO.headlines.A)).toEqual([
            'Gukesh or Sindarov?',
            'Call it before Game 1.',
        ]);
        expect(content.sentences(content.FINAL_CTA.heading('November 24'))).toEqual([
            'Game 1 starts November 24.',
            'Get your picks in.',
        ]);
        expect(content.sentences(HERO.headlines.B)).toEqual([HERO.headlines.B]);
    });
});

describe('Black Friday options', () => {
    it('uses the yearly prices of the three plans', () => {
        for (const option of Object.values(OFFER_OPTIONS)) {
            expect(option.plans.map((plan) => plan.yearPrice)).toEqual([144, 804, 2160]);
        }
    });

    it('charges the normal year under option A and less under option B', () => {
        expect(OFFER_OPTIONS.A.plans.every((plan) => plan.offerPrice === plan.yearPrice)).toBe(
            true,
        );
        expect(OFFER_OPTIONS.B.plans.every((plan) => plan.offerPrice < plan.yearPrice)).toBe(true);
        expect(OFFER_OPTIONS.B.renewalNote).toBeTruthy();
    });

    it('ends on Tuesday, December 1 at 11:59 PM Pacific', () => {
        const end = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/Los_Angeles',
        }).format(Date.parse(config.BF_OFFER.endsAt));
        expect(end.replaceAll(String.fromCharCode(0x202f), ' ')).toBe(
            'Tuesday, December 1 at 11:59 PM',
        );
    });
});
