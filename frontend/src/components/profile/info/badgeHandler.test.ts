import { describe, expect, it } from 'vitest';
import { Badge, BadgeCategory, detectNewBadge } from './badgeHandler';

function makeBadge(overrides: Partial<Badge> & { image: string; title: string }): Badge {
    return {
        message: '',
        isEarned: true,
        category: BadgeCategory.All,
        ...overrides,
    };
}

const dojoerBadge = makeBadge({
    image: '/static/badges/misc/DojoHeart.png',
    title: 'Dojo member since 1.0',
});

const tacticsChampionBadge = makeBadge({
    image: '/static/badges/misc/tacticschampion.png',
    title: 'Tactics Champion',
});

const polgarBadge = makeBadge({
    image: '/static/badges/polgar/v1/50.png',
    title: 'Polgar M1 - 50',
});

describe('detectNewBadge', () => {
    describe('when previousEarnedBadges is undefined (first mount)', () => {
        it('returns "none" when data is NOT fully loaded (race condition guard)', () => {
            const result = detectNewBadge(undefined, [dojoerBadge], false);
            expect(result.action).toBe('none');
        });

        it('returns "initialize" when data IS fully loaded', () => {
            const result = detectNewBadge(undefined, [dojoerBadge, tacticsChampionBadge], true);
            expect(result).toEqual({
                action: 'initialize',
                badges: [dojoerBadge, tacticsChampionBadge],
            });
        });

        it('returns "none" when data is loading even if earned badges exist', () => {
            const result = detectNewBadge(
                undefined,
                [dojoerBadge, tacticsChampionBadge, polgarBadge],
                false,
            );
            expect(result.action).toBe('none');
        });
    });

    describe('when previousEarnedBadges exists (baseline set)', () => {
        it('returns "none" when earned badges have not changed', () => {
            const baseline = [dojoerBadge];
            const result = detectNewBadge(baseline, [dojoerBadge], true);
            expect(result.action).toBe('none');
        });

        it('detects a genuinely new badge earned during session', () => {
            const baseline = [dojoerBadge];
            const current = [dojoerBadge, tacticsChampionBadge];
            const result = detectNewBadge(baseline, current, true);
            expect(result).toEqual({
                action: 'new_badge',
                newBadge: tacticsChampionBadge,
                allEarned: current,
            });
        });

        it('detects the first new badge when multiple new badges are earned', () => {
            const baseline = [dojoerBadge];
            const current = [dojoerBadge, tacticsChampionBadge, polgarBadge];
            const result = detectNewBadge(baseline, current, true);
            expect(result).toEqual({
                action: 'new_badge',
                newBadge: tacticsChampionBadge,
                allEarned: current,
            });
        });

        it('returns "none" when badges are the same even with dataFullyLoaded false', () => {
            const baseline = [dojoerBadge, tacticsChampionBadge];
            const result = detectNewBadge(baseline, [dojoerBadge, tacticsChampionBadge], false);
            expect(result.action).toBe('none');
        });
    });

    describe('race condition scenario (the bug this fix addresses)', () => {
        it('prevents false popup when requirements load in stages', () => {
            const partialBadges = [dojoerBadge];
            const fullBadges = [dojoerBadge, tacticsChampionBadge];

            const step1 = detectNewBadge(undefined, partialBadges, false);
            expect(step1.action).toBe('none');

            const step2 = detectNewBadge(undefined, fullBadges, false);
            expect(step2.action).toBe('none');

            const step3 = detectNewBadge(undefined, fullBadges, true);
            expect(step3).toEqual({
                action: 'initialize',
                badges: fullBadges,
            });
        });

        it('would have caused a false popup under old logic (without dataFullyLoaded guard)', () => {
            const partialBadges = [dojoerBadge];
            const fullBadges = [dojoerBadge, tacticsChampionBadge];

            const baselineSetEarly = detectNewBadge(undefined, partialBadges, true);
            expect(baselineSetEarly).toEqual({
                action: 'initialize',
                badges: partialBadges,
            });

            const falsePositive = detectNewBadge(partialBadges, fullBadges, true);
            expect(falsePositive).toEqual({
                action: 'new_badge',
                newBadge: tacticsChampionBadge,
                allEarned: fullBadges,
            });
        });
    });
});
