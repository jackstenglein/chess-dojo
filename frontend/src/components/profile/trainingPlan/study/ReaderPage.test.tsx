import { User } from '@/database/user';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCourseCache } from './courseCache';
import {
    cohortCourse,
    courses,
    member,
    memberAt1000,
    memberEntries,
    polgarPart1,
    polgarPart2,
    polgarTask,
    requirements,
    user,
} from './overviewFixtures';
import { ReaderPage } from './ReaderPage';

const mocks = vi.hoisted(() => ({
    api: { listAllCourses: vi.fn(), listUserTimeline: vi.fn(), getCourse: vi.fn() },
    auth: { user: undefined as User | undefined, status: 'Authenticated' },
    requirements: [] as unknown[],
    editor: vi.fn(),
}));

vi.mock('@/api/Api', () => ({ useApi: () => mocks.api }));
vi.mock('@/auth/Auth', () => ({
    AuthStatus: { Loading: 'Loading', Authenticated: 'Authenticated' },
    useAuth: () => mocks.auth,
}));
vi.mock('@/api/cache/Cache', () => ({
    useCache: () => ({ requirements: { isFetched: () => true } }),
}));
vi.mock('@/api/cache/requirements', () => ({
    useRequirements: () => ({
        requirements: mocks.requirements,
        request: { isSent: () => true, isLoading: () => false, isFailure: () => false },
    }),
}));
vi.mock('@/loading/LoadingPage', () => ({ default: () => <div data-testid='loading' /> }));
vi.mock('@/components/navigation/Link', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));
vi.mock('@/components/profile/trainingPlan/CustomTaskEditor', () => ({
    default: (props: { open: boolean; initialName?: string; initialMaterial?: unknown }) => {
        mocks.editor(props);
        return props.open ? <div data-testid='editor'>{props.initialName}</div> : null;
    },
}));

describe('ReaderPage', () => {
    beforeEach(() => {
        clearCourseCache();
        mocks.auth.user = member;
        mocks.requirements = requirements;
        mocks.api.listAllCourses.mockReset().mockResolvedValue(courses);
        mocks.api.listUserTimeline
            .mockReset()
            .mockResolvedValue({ entries: memberEntries, lastEvaluatedKey: '' });
        mocks.api.getCourse.mockReset().mockImplementation((_type: string, id: string) =>
            Promise.resolve({
                data: {
                    course:
                        id === 'polgar-1'
                            ? polgarPart1
                            : id === 'polgar-2'
                              ? polgarPart2
                              : cohortCourse,
                },
            }),
        );
        mocks.editor.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    async function renderReader() {
        renderWithIntl(<ReaderPage />);
        await screen.findByTestId('reader-page');
    }

    it('shows the cohort study, the member material, and the switch on the own cohort', async () => {
        await renderReader();

        const cohort = screen.getByTestId('reader-cohort-study');
        expect(within(cohort).getByText('Study Master Games')).toBeTruthy();
        expect(screen.getByTestId('reader-cohort-count').textContent).toBe('5 of 22 games');
        const nextKey = encodeURIComponent('course:STUDY/study-master-games-1500-1600/m6/0');
        await waitFor(() =>
            expect(screen.getByTestId('reader-continue').getAttribute('href')).toBe(
                `/study/study-1500-1600?item=${nextKey}`,
            ),
        );
        expect(within(cohort).getByText('Master Games 1500-1600, 22 games')).toBeTruthy();
        expect(within(cohort).getByText('Game 6')).toBeTruthy();

        expect(screen.getAllByTestId('reader-study-row')).toHaveLength(2);
        expect(screen.getAllByTestId('reader-course-row').map((r) => r.textContent)).toEqual([
            expect.stringContaining('French Defense'),
            expect.stringContaining('Caro Kann'),
        ]);
        expect(screen.getAllByTestId('reader-read')[0].getAttribute('href')).toBe(
            '/study/course/OPENING/french',
        );

        expect(screen.getByTestId<HTMLInputElement>('reader-cohort-switch').value).toBe(
            '1500-1600',
        );
        expect(screen.queryByTestId('reader-viewing-other')).toBeNull();

        expect(screen.getByTestId('reader-page').textContent).not.toMatch(/\$|buy|purchase/i);
    });

    it('switches to another cohort, browsing, and resets on a new visit', async () => {
        await renderReader();
        fireEvent.change(screen.getByTestId('reader-cohort-switch'), {
            target: { value: '1800-1900' },
        });
        expect(screen.getByTestId('reader-viewing-other').textContent).toContain('1800-1900');
        const tile = await screen.findByTestId('reader-cohort-browse');
        expect(within(tile).getByText('Study Master Games')).toBeTruthy();
        await waitFor(() =>
            expect(screen.getByTestId('reader-continue').getAttribute('href')).toContain(
                'cohort=1800-1900',
            ),
        );
        expect(screen.getByTestId('reader-continue').getAttribute('href')).toMatch(
            /^\/study\/study-1800-1900\?/,
        );
        expect(screen.queryByTestId('reader-cohort-study')).toBeNull();

        cleanup();
        await renderReader();
        expect(screen.getByTestId<HTMLInputElement>('reader-cohort-switch').value).toBe(
            '1500-1600',
        );
    });

    it('keeps the own cohort in the switch when it has no study', async () => {
        mocks.requirements = requirements.filter((r) => !r.counts['1500-1600']);
        await renderReader();
        fireEvent.change(screen.getByTestId('reader-cohort-switch'), {
            target: { value: '1800-1900' },
        });
        expect(screen.getByTestId('reader-viewing-other').textContent).toContain('1800-1900');
        fireEvent.change(screen.getByTestId('reader-cohort-switch'), {
            target: { value: '1500-1600' },
        });
        expect(screen.getByTestId<HTMLInputElement>('reader-cohort-switch').value).toBe(
            '1500-1600',
        );
        expect(screen.queryByTestId('reader-viewing-other')).toBeNull();
    });

    it('reads older timeline pages until the last study entry is found', async () => {
        mocks.api.listUserTimeline
            .mockReset()
            .mockImplementation((_owner: string, startKey?: string) =>
                Promise.resolve(
                    startKey
                        ? { entries: [memberEntries[0]], lastEvaluatedKey: '' }
                        : { entries: memberEntries.slice(1), lastEvaluatedKey: 'older' },
                ),
            );
        await renderReader();
        const nextKey = encodeURIComponent('course:STUDY/study-master-games-1500-1600/m6/0');
        await waitFor(() =>
            expect(screen.getByTestId('reader-continue').getAttribute('href')).toBe(
                `/study/study-1500-1600?item=${nextKey}`,
            ),
        );
        expect(mocks.api.listUserTimeline).toHaveBeenCalledTimes(2);
    });

    it('keeps courses outside the cohort behind a switch', async () => {
        await renderReader();
        fireEvent.click(screen.getByTestId('reader-show-outside'));
        expect(screen.getAllByTestId('reader-course-row')).toHaveLength(3);
        expect(screen.getByText('The Aggressive e4 Repertoire')).toBeTruthy();
    });

    it('opens the task editor with the course prefilled from Add to plan', async () => {
        await renderReader();
        const row = screen.getAllByTestId('reader-course-row')[0];
        fireEvent.click(within(row).getByRole('button', { name: 'Add to plan' }));
        await waitFor(() =>
            expect(screen.getByTestId('editor').textContent).toBe('French Defense'),
        );
        expect(mocks.editor).toHaveBeenLastCalledWith(
            expect.objectContaining({
                initialMaterial: { kind: 'COURSE', courseType: 'OPENING', courseId: 'french' },
                initialCategory: 'Opening',
            }),
        );
    });

    describe('a workbook on the plan', () => {
        const polgarCalls = () =>
            mocks.api.getCourse.mock.calls.filter(([, id]) => String(id).startsWith('polgar-'))
                .length;

        it('reads parts only as far as the pointer and names the next position', async () => {
            mocks.auth.user = memberAt1000;
            mocks.requirements = [...requirements, polgarTask];
            await renderReader();
            const tile = screen
                .getAllByTestId('reader-cohort-study')
                .find((el) => el.textContent?.includes('Polgar'));
            if (!tile) throw new Error('no Polgar tile');
            expect(within(tile).getByText('114 of 344 exercises')).toBeTruthy();
            expect(within(tile).getByText('Continue at exercise 421')).toBeTruthy();
            expect(within(tile).getByText('Solve Polgar M2s through Problem 650')).toBeTruthy();
            await waitFor(() => expect(polgarCalls()).toBe(1));
            expect(within(tile).getByTestId('reader-continue').getAttribute('href')).toBe(
                '/study/polgar',
            );
        });

        it('reads on into the next part when the pointer is past the first', async () => {
            mocks.auth.user = user({
                dojoCohort: '1000-1100',
                progress: {
                    polgar: {
                        requirementId: 'polgar',
                        counts: { ALL_COHORTS: 500 },
                        minutesSpent: {},
                        updatedAt: '',
                    },
                },
            });
            mocks.requirements = [...requirements, polgarTask];
            await renderReader();
            expect(screen.getByText('Continue at exercise 501')).toBeTruthy();
            await waitFor(() => expect(polgarCalls()).toBe(2));
        });
    });
});
