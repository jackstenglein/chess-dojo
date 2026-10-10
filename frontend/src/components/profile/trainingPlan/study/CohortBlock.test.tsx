import { Requirement, RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CohortBlock } from './CohortBlock';
import { buildOverview } from './overview';
import { polgarTask, user } from './overviewFixtures';

vi.mock('@/components/navigation/Link', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

/** Shaped like Read Silman Endgame, Part 1 on dev: a set counted in pages. */
const silmanPart1: Requirement = {
    ...polgarTask,
    id: 'silman1',
    category: RequirementCategory.Endgame,
    name: 'Read Silman Endgame, Part 1',
    counts: { '1000-1100': 30, '1100-1200': 30 },
    startCount: 0,
    progressBarSuffix: ' Pages',
    material: [{ kind: 'COURSE', courseType: 'STUDY', courseId: 'silman-1' }],
};

/** Shaped like Memorize Steinitz - von Bardeleben on dev: one game and no suffix. */
const steinitz: Requirement = {
    ...polgarTask,
    id: 'steinitz',
    category: RequirementCategory.Games,
    name: 'Memorize Steinitz - von Bardeleben',
    counts: { '1000-1100': 1 },
    startCount: 0,
    scoreboardDisplay: ScoreboardDisplay.Checkbox,
    progressBarSuffix: '',
    material: [{ kind: 'COURSE', courseType: 'STUDY', courseId: 'steinitz' }],
};

describe('CohortBlock: the unit on a set', () => {
    afterEach(() => {
        cleanup();
    });

    it("counts a set in its task's suffix, and in games with a plural when there is none", () => {
        const member = user({
            dojoCohort: '1000-1100',
            progress: {
                silman1: {
                    requirementId: 'silman1',
                    counts: { ALL_COHORTS: 30 },
                    minutesSpent: {},
                    updatedAt: '',
                },
            },
        });
        const model = buildOverview({
            user: member,
            requirements: [silmanPart1, steinitz],
            courses: [],
            entries: [],
        });
        renderWithIntl(<CohortBlock studies={model.cohortStudies} />);
        const [pages, game] = screen.getAllByTestId('reader-cohort-study');

        expect(within(pages).getByText('30 pages')).toBeTruthy();
        expect(within(pages).getByTestId('reader-cohort-count').textContent).toBe('30 of 30 pages');
        // A set has no target to reach, whatever its unit.
        expect(within(pages).getAllByText('Continue')).toHaveLength(2);

        expect(within(game).getByText('1 game')).toBeTruthy();
        expect(within(game).getByTestId('reader-cohort-count').textContent).toBe('0 of 1 studied');
        expect(within(game).getAllByText('Start')).toHaveLength(2);
    });
});
