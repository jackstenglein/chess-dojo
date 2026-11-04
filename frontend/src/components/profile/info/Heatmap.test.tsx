import { RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { TimelineEntry, TimelineSpecialRequirementId } from '@/database/timeline';
import { User } from '@/database/user';
import { CategoryColors } from '@/style/ThemeProvider';
import {
    calculateColor,
    calculateLevel,
    CLASSICAL_GAMES_REQUIREMENT_ID,
} from '@jackstenglein/chess-dojo-common/src/heatmap/heatmap';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Heatmap } from './Heatmap';
import {
    blockId,
    makeEntry,
    makeUser,
    MAX_DATE,
    MIN_DATE,
    renderHeatmap,
    workGoal,
} from './heatmapTestUtils';

const auth = vi.hoisted(() => ({
    user: undefined as User | undefined,
}));

const api = vi.hoisted(() => ({
    updateUserTimeline: vi.fn(),
}));

const timeline = vi.hoisted(() => ({
    owner: 'owner',
    onEditEntries: vi.fn(),
    onDeleteEntries: vi.fn(),
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: auth.user }),
}));

vi.mock('@/api/Api', () => ({
    useApi: () => api,
}));

vi.mock('@/style/useLightMode', () => ({
    useLightMode: () => true,
}));

vi.mock('@/components/profile/activity/useTimeline', () => ({
    useTimelineContext: () => timeline,
}));

const LIGHT_BASE = '#EBEDF0';
const MONOCHROME = '#6f02e3';

function renderSubject(props: Partial<ComponentProps<typeof Heatmap>> = {}) {
    return renderHeatmap(
        <Heatmap
            entries={[]}
            description='in the past year'
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            workGoalHistory={[]}
            {...props}
        />,
    );
}

function openRestDayMenu(date: string) {
    fireEvent.contextMenu(screen.getByTestId(blockId(date)), { clientX: 12, clientY: 24 });
}

describe('Heatmap', () => {
    beforeEach(() => {
        localStorage.clear();
        auth.user = makeUser();
        timeline.owner = 'owner';
        timeline.onEditEntries.mockReset();
        timeline.onDeleteEntries.mockReset();
        api.updateUserTimeline.mockReset();
        api.updateUserTimeline.mockResolvedValue({});
    });

    afterEach(() => {
        cleanup();
        localStorage.clear();
    });

    it('totals the selected measure across the visible range', () => {
        renderSubject({
            entries: [
                makeEntry('2026-10-22', {
                    id: 'openings',
                    requirementId: 'openings',
                    requirementName: 'Opening',
                    requirementCategory: RequirementCategory.Opening,
                    minutesSpent: 15,
                    dojoPoints: 0.5,
                }),
                makeEntry('2026-10-20', { minutesSpent: 30, dojoPoints: 2 }),
                makeEntry('2026-10-20', {
                    id: 'bad',
                    requirementId: 'bad',
                    requirementName: 'Ignored',
                    minutesSpent: -10,
                    dojoPoints: -1,
                }),
                makeEntry('2026-01-01', {
                    id: 'old',
                    requirementId: 'old',
                    minutesSpent: 1000,
                    dojoPoints: 50,
                }),
            ],
        });

        expect(screen.getByText('45m in the past year')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Heatmap settings' }));
        fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }));
        fireEvent.click(screen.getByRole('option', { name: 'Dojo Points' }));

        expect(screen.getByText('2.5 Dojo points in the past year')).toBeInTheDocument();
        expect(screen.queryByText('45m in the past year')).not.toBeInTheDocument();
    });

    it('labels every other weekday from the configured week start', () => {
        renderSubject();

        expect(screen.getByText('Mon')).toBeInTheDocument();
        expect(screen.getByText('Wed')).toBeInTheDocument();
        expect(screen.getByText('Fri')).toBeInTheDocument();
        expect(screen.getByText('Week')).toBeInTheDocument();
        expect(screen.queryByText('Tue')).not.toBeInTheDocument();

        cleanup();
        auth.user = makeUser({ weekStart: 1 });
        renderSubject();

        expect(screen.getByText('Tue')).toBeInTheDocument();
        expect(screen.getByText('Thur')).toBeInTheDocument();
        expect(screen.getByText('Sat')).toBeInTheDocument();
        expect(screen.queryByText('Mon')).not.toBeInTheDocument();
    });

    it('lists what was logged on a day', async () => {
        renderSubject({
            entries: [
                makeEntry('2026-10-20', {
                    id: 'storm-1',
                    minutesSpent: 20,
                    requirementName: 'Puzzle Storm',
                }),
                makeEntry('2026-10-20', {
                    id: 'storm-2',
                    minutesSpent: 25,
                    requirementName: 'Puzzle Storm',
                }),
                makeEntry('2026-10-20', {
                    id: 'spar',
                    requirementId: 'sparring',
                    requirementName: 'Sparring',
                    requirementCategory: RequirementCategory.Games,
                    minutesSpent: 10,
                }),
                makeEntry('2026-10-20', {
                    id: 'bad',
                    requirementId: 'bad',
                    requirementName: 'Ignored',
                    minutesSpent: -5,
                }),
                makeEntry('2026-10-22', {
                    id: 'other-day',
                    requirementName: 'Opening Work',
                    minutesSpent: 40,
                }),
            ],
        });

        const user = userEvent.setup();
        await user.hover(screen.getByTestId(blockId('2026-10-20')));

        await waitFor(() => {
            const popover = screen.getByTestId('heatmap-day-details');
            expect(popover).toHaveTextContent(/October 20/);
            expect(within(popover).getByText('Puzzle Storm')).toBeInTheDocument();
            expect(within(popover).getByText('45m')).toBeInTheDocument();
            expect(within(popover).getByText('Sparring')).toBeInTheDocument();
            expect(within(popover).getByText('10m')).toBeInTheDocument();
            expect(within(popover).getByText('Total 55m')).toBeInTheDocument();
            expect(within(popover).queryByText('Ignored')).not.toBeInTheDocument();
            expect(within(popover).queryByText('Opening Work')).not.toBeInTheDocument();
        });
    });

    it('says when a day has nothing logged', async () => {
        renderSubject();

        const user = userEvent.setup();
        await user.hover(screen.getByTestId(blockId('2026-10-19')));

        await waitFor(() =>
            expect(screen.getByTestId('heatmap-day-details')).toHaveTextContent(
                'Nothing logged this day',
            ),
        );
    });

    it('shows rest days and published games in the day summary', async () => {
        renderSubject({
            entries: [
                makeEntry('2026-10-19', {
                    id: 'rest',
                    requirementId: TimelineSpecialRequirementId.RestDay,
                    requirementName: 'Stored rest day name',
                    requirementCategory: RequirementCategory.NonDojo,
                    minutesSpent: 0,
                    dojoPoints: 0,
                }),
                makeEntry('2026-10-21', {
                    id: 'game',
                    requirementId: TimelineSpecialRequirementId.GameSubmission,
                    requirementName: 'Should not show',
                    requirementCategory: RequirementCategory.Games,
                    minutesSpent: 25,
                }),
            ],
        });
        const user = userEvent.setup();

        await user.hover(screen.getByTestId(blockId('2026-10-19')));
        await waitFor(() => {
            const popover = screen.getByTestId('heatmap-day-details');
            expect(popover).toHaveTextContent('Rest Day');
            expect(popover).not.toHaveTextContent('Stored rest day name');
            expect(popover).not.toHaveTextContent('Total');
        });

        await user.hover(screen.getByTestId(blockId('2026-10-21')));
        await waitFor(() => {
            const popover = screen.getByTestId('heatmap-day-details');
            expect(popover).toHaveTextContent('Published a new game analysis');
            expect(popover).toHaveTextContent('Total 25m');
            expect(popover).not.toHaveTextContent('Should not show');
        });
    });

    describe('rest days', () => {
        it('lets the owner mark an empty day as a rest day', async () => {
            const randomUUID = vi
                .spyOn(crypto, 'randomUUID')
                .mockReturnValue('11111111-1111-4111-8111-111111111111');

            try {
                renderSubject();
                expect(screen.getByTestId(blockId(MIN_DATE))).toHaveAttribute(
                    'data-can-manage-rest-day',
                    'true',
                );

                openRestDayMenu(MIN_DATE);
                fireEvent.click(screen.getByRole('menuitem', { name: 'Rest Day' }));

                const entry = {
                    id: `${MIN_DATE}_11111111-1111-4111-8111-111111111111`,
                    owner: 'owner',
                    ownerDisplayName: 'Owner',
                    cohort: '1400-1500',
                    requirementId: TimelineSpecialRequirementId.RestDay,
                    requirementName: 'Rest Day',
                    requirementCategory: RequirementCategory.NonDojo,
                    scoreboardDisplay: ScoreboardDisplay.Hidden,
                    minutesSpent: 0,
                    dojoPoints: 0,
                };
                expect(timeline.onEditEntries).toHaveBeenCalledWith([
                    expect.objectContaining({
                        ...entry,
                        date: expect.stringMatching(new RegExp(`^${MIN_DATE}T17:00:00`)) as string,
                    }),
                ]);
                await waitFor(() => expect(api.updateUserTimeline).toHaveBeenCalled());
                expect(api.updateUserTimeline).toHaveBeenCalledWith({
                    requirementId: TimelineSpecialRequirementId.RestDay,
                    progress: {
                        requirementId: TimelineSpecialRequirementId.RestDay,
                        counts: {},
                        minutesSpent: {},
                        updatedAt: '',
                    },
                    updated: [expect.objectContaining(entry)],
                    deleted: [],
                });
            } finally {
                randomUUID.mockRestore();
            }
        });

        it('rolls back a rest day when saving fails', async () => {
            api.updateUserTimeline.mockRejectedValueOnce(new Error('nope'));
            renderSubject();
            openRestDayMenu(MIN_DATE);
            fireEvent.click(screen.getByRole('menuitem', { name: 'Rest Day' }));

            expect(await screen.findByText('nope')).toBeInTheDocument();
            expect(timeline.onDeleteEntries).toHaveBeenCalledWith(
                timeline.onEditEntries.mock.calls[0][0],
            );
        });

        it('lets the owner clear a rest day', async () => {
            const restEntry = restDay('2026-10-19');
            renderSubject({ entries: [restEntry] });

            openRestDayMenu('2026-10-19');
            fireEvent.click(screen.getByRole('menuitem', { name: 'Clear Rest Day' }));

            expect(timeline.onDeleteEntries).toHaveBeenCalledWith([restEntry]);
            await waitFor(() => expect(api.updateUserTimeline).toHaveBeenCalled());
            expect(api.updateUserTimeline).toHaveBeenCalledWith(
                expect.objectContaining({
                    updated: [],
                    deleted: [restEntry],
                }),
            );
        });

        it('restores a rest day when clearing fails', async () => {
            const restEntry = restDay('2026-10-19');
            api.updateUserTimeline.mockRejectedValueOnce(new Error('nope'));
            renderSubject({ entries: [restEntry] });

            openRestDayMenu('2026-10-19');
            fireEvent.click(screen.getByRole('menuitem', { name: 'Clear Rest Day' }));

            expect(await screen.findByText('nope')).toBeInTheDocument();
            expect(timeline.onEditEntries).toHaveBeenCalledWith([restEntry]);
        });

        it('does not offer rest days for active days or other viewers', () => {
            renderSubject({
                entries: [
                    makeEntry('2026-10-20', { minutesSpent: 30 }),
                    makeEntry('2026-10-21', {
                        id: 'classical',
                        requirementId: CLASSICAL_GAMES_REQUIREMENT_ID,
                        requirementName: 'Classical',
                        requirementCategory: RequirementCategory.Games,
                        minutesSpent: 0,
                        dojoPoints: 0,
                    }),
                ],
            });

            expect(screen.getByTestId(blockId('2026-10-20'))).toHaveAttribute(
                'data-can-manage-rest-day',
                'false',
            );
            expect(screen.getByTestId(blockId('2026-10-21'))).toHaveAttribute(
                'data-can-manage-rest-day',
                'false',
            );
            openRestDayMenu('2026-10-20');
            expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();

            cleanup();
            auth.user = makeUser({ username: 'visitor' });
            renderSubject();
            expect(screen.getByTestId(blockId(MIN_DATE))).toHaveAttribute(
                'data-can-manage-rest-day',
                'false',
            );
            openRestDayMenu(MIN_DATE);
            expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
        });
    });

    it('explains the scale and hides category colors in single color mode', () => {
        renderSubject();
        const legendButton = screen.getByRole('button', { name: 'What the colors mean' });
        fireEvent.click(legendButton);

        // The open tooltip labels the button with its contents, so keep the element from before.
        const legend = screen.getByTestId('heatmap-legend');
        expect(legend).toHaveTextContent('Less');
        expect(legend).toHaveTextContent('More');
        expect(legend).toHaveTextContent('Tactics');
        expect(legend).toHaveTextContent('Middlegame');
        expect(legend).toHaveTextContent('Custom Task');
        expect(legend).toHaveTextContent('Classical Game Played');
        expect(legend).toHaveTextContent('Rest Day');
        expect(legendButton).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(screen.getByRole('button', { name: 'Heatmap settings' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Single Color Mode' }));

        expect(legend).toHaveTextContent('Less');
        expect(legend).not.toHaveTextContent('Classical Game Played');
        expect(legend).not.toHaveTextContent('Custom Task');
    });

    it('colors a day by its main category', () => {
        renderSubject({
            entries: [
                makeEntry('2026-10-20', {
                    minutesSpent: 30,
                    requirementCategory: RequirementCategory.Tactics,
                }),
            ],
        });

        const expected = calculateColor(
            [LIGHT_BASE, CategoryColors[RequirementCategory.Tactics]],
            calculateLevel(30, 60),
        );
        expect(screen.getByTestId(blockId('2026-10-20'))).toHaveStyle({ fill: expected });
    });

    it('stripes custom tasks and uses one color in single color mode', () => {
        const custom = makeEntry('2026-10-20', {
            isCustomRequirement: true,
            minutesSpent: 30,
            requirementName: 'Custom tactics',
        });
        renderSubject({ entries: [custom] });

        expect(
            screen
                .getAllByTestId(blockId('2026-10-20'))
                .some((block) => block.getAttribute('fill') === 'url(#diagonalHatch)'),
        ).toBe(true);

        cleanup();
        localStorage.setItem('activityHeatmap.colorMode', JSON.stringify('monochrome'));
        renderSubject({ entries: [custom] });

        const blocks = screen.getAllByTestId(blockId('2026-10-20'));
        expect(blocks.every((block) => block.getAttribute('fill') !== 'url(#diagonalHatch)')).toBe(
            true,
        );
        expect(blocks[0]).toHaveStyle({
            fill: calculateColor([LIGHT_BASE, MONOCHROME], calculateLevel(30, 60)),
        });
    });

    describe('weekly goal', () => {
        it('marks a finished week as missed when the time is short', () => {
            renderSubject();

            expect(screen.getByTestId('CloseIcon')).toBeInTheDocument();
            expect(screen.queryByTestId('CheckCircleIcon')).not.toBeInTheDocument();
            expect(screen.queryByTestId('HourglassBottomIcon')).not.toBeInTheDocument();
        });

        it('uses the latest goal on or before the week and ignores later goals', () => {
            renderSubject({
                entries: [makeEntry('2026-10-20', { minutesSpent: 80 })],
                workGoalHistory: [
                    workGoal('2026-01-01T00:00:00.000Z', 10),
                    workGoal('2026-10-30T00:00:00.000Z', 200),
                ],
            });

            expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
            expect(screen.queryByTestId('CloseIcon')).not.toBeInTheDocument();
        });

        it('shows an unfinished week as in progress until the goal is met', () => {
            renderSubject({ maxDate: '2026-10-21' });

            expect(screen.getByTestId('HourglassBottomIcon')).toBeInTheDocument();
            expect(screen.queryByTestId('CloseIcon')).not.toBeInTheDocument();
            expect(screen.queryByTestId('CheckCircleIcon')).not.toBeInTheDocument();
        });
    });
});

function restDay(on: string): TimelineEntry {
    return makeEntry(on, {
        id: `rest-${on}`,
        requirementId: TimelineSpecialRequirementId.RestDay,
        requirementName: 'Rest Day',
        requirementCategory: RequirementCategory.NonDojo,
        minutesSpent: 0,
        dojoPoints: 0,
    });
}
