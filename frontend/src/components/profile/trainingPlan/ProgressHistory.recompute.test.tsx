import {
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DateTime } from 'luxon';
import { NextIntlClientProvider } from 'next-intl';
import { forwardRef, type ChangeEventHandler, type ReactNode } from 'react';
import { VirtuosoMockContext } from 'react-virtuoso';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressHistory from './ProgressHistory';
import { ProgressHistoryList } from './ProgressHistoryList';
import type { HistoryItem } from './progressHistoryEditor';

const messages = {
    profile: {
        trainingPlan: {
            common: {
                cancel: 'Cancel',
                save: 'Save',
                taskDetails: 'Task Details',
                updateProgress: 'Update Progress',
                date: 'Date',
                hours: 'Hours',
                minutes: 'Minutes',
                comments: 'Comments',
                commentsPlaceholder: 'Optional comments',
                fieldRequired: 'This field is required',
                mustBeInteger: 'This field must be an integer',
            },
            progressHistory: {
                addNew: 'Add New',
                noHistory: 'No history yet. Use the + button above to log your first entry.',
                newEntryLabel: 'New',
                fillInDetails: 'Fill in the details below',
                cohort: 'Cohort',
                deleteEntry: 'Delete entry',
                totalCount: 'Total {label} : {total}. Current Cohort: {cohortCount}',
                totalTime:
                    'Total Time: {totalHours}h {totalMinutes}m. Current Cohort: {cohortHours}h {cohortMinutes}m',
                deleteAriaLabel: 'delete',
            },
        },
    },
};

const mocks = vi.hoisted(() => ({
    entries: [] as TimelineEntry[],
    getTimelineUpdate: vi.fn(() => ({
        progress: { requirementId: 'classical-games', minutesSpent: {}, counts: {}, updatedAt: '' },
        updated: [],
        deleted: [],
        errors: {},
    })),
    onClose: vi.fn(),
    onDeleteEntries: vi.fn(),
    onEditEntries: vi.fn(),
    textFieldLabels: [] as (string | undefined)[],
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({
        user: {
            username: 'test',
            displayName: 'Test User',
            dojoCohort: '1400-1500',
            timeFormat: '24',
        },
    }),
}));

vi.mock('@/components/profile/activity/useTimeline', () => ({
    useTimelineContext: () => ({
        entries: mocks.entries,
        request: { isLoading: () => false },
        onEditEntries: mocks.onEditEntries,
        onDeleteEntries: mocks.onDeleteEntries,
    }),
}));

vi.mock('@mui/material', () => {
    const domProps = (props: Record<string, unknown>) => {
        const result: Record<string, unknown> = {};
        for (const key of ['aria-label', 'data-testid', 'placeholder']) {
            if (props[key] !== undefined) {
                result[key] = props[key];
            }
        }
        return result;
    };

    const Container = forwardRef<
        HTMLDivElement,
        {
            children?: ReactNode;
            [key: string]: unknown;
        }
    >(function Container({ children, ...props }, ref) {
        return (
            <div ref={ref} {...domProps(props)}>
                {children as ReactNode}
            </div>
        );
    });

    const Button = ({
        children,
        disabled,
        onClick,
        ...props
    }: {
        children?: ReactNode;
        disabled?: boolean;
        onClick?: () => void;
        [key: string]: unknown;
    }) => (
        <button type='button' disabled={disabled} onClick={onClick} {...domProps(props)}>
            {children}
        </button>
    );

    const TextField = ({
        children,
        label,
        multiline,
        onChange,
        onBlur,
        select,
        value,
        ...props
    }: {
        children?: ReactNode;
        label?: string;
        multiline?: boolean;
        onChange?: ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
        onBlur?: ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
        select?: boolean;
        value?: string;
        [key: string]: unknown;
    }) => {
        mocks.textFieldLabels.push(label);

        const inputProps = {
            'aria-label': label,
            value: value ?? '',
            ...domProps(props),
        };

        if (select) {
            return (
                <select {...inputProps} onChange={onChange} onBlur={onBlur}>
                    {children}
                </select>
            );
        }

        if (multiline) {
            return <textarea {...inputProps} onChange={onChange} onBlur={onBlur} />;
        }

        return <input {...inputProps} onChange={onChange} onBlur={onBlur} />;
    };

    return {
        Alert: Container,
        Box: Container,
        Button,
        Chip: ({ label }: { label?: ReactNode }) => <span>{label}</span>,
        DialogActions: Container,
        DialogContent: Container,
        DialogContentText: Container,
        Divider: () => <hr />,
        Grid: Container,
        IconButton: ({
            children,
            onClick,
            ...props
        }: {
            children?: ReactNode;
            onClick?: () => void;
            [key: string]: unknown;
        }) => (
            <button type='button' onClick={onClick} {...domProps(props)}>
                {children}
            </button>
        ),
        MenuItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
            <option value={value}>{children}</option>
        ),
        Snackbar: ({
            children,
            message,
            open,
            ...props
        }: {
            children?: ReactNode;
            message?: ReactNode;
            open?: boolean;
            [key: string]: unknown;
        }) => (open ? <div {...domProps(props)}>{children ?? message}</div> : null),
        Stack: Container,
        TextField,
        Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
        Typography: Container,
    };
});

vi.mock('@mui/x-date-pickers', () => ({
    DateTimePicker: ({
        label,
        value,
        onChange,
    }: {
        label: string;
        value: { toISO: () => string } | null;
        onChange: (value: null) => void;
    }) => (
        <input
            aria-label={label}
            value={value?.toISO() ?? ''}
            onChange={() => onChange(null)}
            readOnly
        />
    ),
}));

vi.mock('./TaskDialog', () => ({
    TaskDialogView: {
        Details: 'DETAILS',
        Progress: 'PROGRESS',
        History: 'HISTORY',
    },
}));

vi.mock('./progressHistoryEditor', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./progressHistoryEditor')>();
    return {
        ...actual,
        getTimelineUpdate: mocks.getTimelineUpdate,
    };
});

const requirement: Requirement = {
    id: 'classical-games',
    status: RequirementStatus.Active,
    category: RequirementCategory.Games,
    name: 'Play Classical Games',
    description: '',
    freeDescription: '',
    counts: { '1400-1500': 40 },
    startCount: 0,
    numberOfCohorts: 1,
    unitScore: 1,
    totalScore: 0,
    scoreboardDisplay: ScoreboardDisplay.Yearly,
    progressBarSuffix: 'games',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sortPriority: 'games',
    expirationDays: -1,
    isFree: false,
    atomic: false,
    expectedMinutes: 0,
};

function makeEntry(index: number): TimelineEntry {
    const date = new Date(Date.UTC(2026, 0, index + 1, 12)).toISOString();
    return {
        owner: 'test',
        id: `entry-${index}`,
        ownerDisplayName: 'Test User',
        cohort: '1400-1500',
        requirementId: requirement.id,
        requirementName: requirement.name,
        requirementCategory: RequirementCategory.Games,
        scoreboardDisplay: ScoreboardDisplay.Yearly,
        progressBarSuffix: 'games',
        totalCount: 40,
        previousCount: index,
        newCount: index + 1,
        dojoPoints: 1,
        totalDojoPoints: index + 1,
        minutesSpent: 30,
        totalMinutesSpent: (index + 1) * 30,
        date,
        createdAt: date,
        notes: `notes ${index}`,
        comments: [],
        reactions: {},
    };
}

function makeHistoryItem(index: number): HistoryItem {
    const entry = makeEntry(index);
    return {
        date: DateTime.fromISO(entry.date || entry.createdAt),
        count: `${entry.newCount - (entry.previousCount ?? 0)}`,
        hours: `${Math.floor(entry.minutesSpent / 60)}`,
        minutes: `${entry.minutesSpent % 60}`,
        notes: entry.notes,
        cohort: entry.cohort,
        entry,
        index,
        deleted: false,
        isNew: false,
    };
}

function renderDialog() {
    return render(
        <NextIntlClientProvider locale='en' messages={messages}>
            <VirtuosoMockContext.Provider value={{ viewportHeight: 700, itemHeight: 300 }}>
                <ProgressHistory requirement={requirement} onClose={mocks.onClose} />
            </VirtuosoMockContext.Provider>
        </NextIntlClientProvider>,
    );
}

function renderListWithoutScrollParent() {
    const items = Array.from({ length: 150 }, (_, index) => makeHistoryItem(index));
    return render(
        <NextIntlClientProvider locale='en' messages={messages}>
            <VirtuosoMockContext.Provider value={{ viewportHeight: 700, itemHeight: 300 }}>
                <ProgressHistoryList
                    requirement={requirement}
                    items={items}
                    errors={{}}
                    updateItem={vi.fn()}
                    updateDraftItem={vi.fn()}
                    getDraftItem={() => undefined}
                    deleteItem={vi.fn()}
                    scrollParent={null}
                />
            </VirtuosoMockContext.Provider>
        </NextIntlClientProvider>,
    );
}

describe('ProgressHistory recompute behavior', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        mocks.entries = Array.from({ length: 150 }, (_, index) => makeEntry(index));
        mocks.getTimelineUpdate.mockClear();
        mocks.onClose.mockClear();
        mocks.onDeleteEntries.mockClear();
        mocks.onEditEntries.mockClear();
        mocks.textFieldLabels = [];
    });

    it('does not build the save payload on initial render or draft edits', async () => {
        renderDialog();

        await screen.findByDisplayValue('notes 149');
        expect(mocks.getTimelineUpdate).not.toHaveBeenCalled();

        fireEvent.change(screen.getAllByLabelText('Comments')[0], {
            target: { value: 'changed notes' },
        });

        expect(mocks.getTimelineUpdate).not.toHaveBeenCalled();
    });

    it('does not rerender unchanged comment fields on draft edits', async () => {
        renderDialog();

        await screen.findByDisplayValue('notes 149');
        mocks.textFieldLabels = [];

        fireEvent.change(screen.getAllByLabelText('Comments')[0], {
            target: { value: 'changed notes' },
        });

        const commentRenderCount = mocks.textFieldLabels.filter(
            (label) => label === 'Comments',
        ).length;
        expect(commentRenderCount).toBeLessThanOrEqual(2);
    });

    it('does not mount the full 150-row history on initial render', async () => {
        renderDialog();

        await screen.findByDisplayValue('notes 149');

        const commentFields = screen.getAllByLabelText('Comments');
        expect(commentFields.length).toBeGreaterThan(0);
        expect(commentFields.length).toBeLessThan(mocks.entries.length);
        expect(screen.queryByDisplayValue('notes 0')).not.toBeInTheDocument();
    });

    it('pre-renders several rows beyond the visible viewport for smoother scrolling', async () => {
        renderDialog();

        await screen.findByDisplayValue('notes 149');

        expect(screen.getAllByLabelText('Comments').length).toBeGreaterThanOrEqual(8);
    });

    it('renders initial rows without depending on the dialog scroll parent', async () => {
        renderListWithoutScrollParent();

        await screen.findByDisplayValue('notes 149');

        expect(screen.getAllByLabelText('Comments').length).toBeGreaterThan(0);
    });

    it('uses the dialog content as the only scroll surface', async () => {
        renderDialog();

        await screen.findByDisplayValue('notes 149');

        expect(screen.getByTestId('task-history-virtual-list')).toBeInTheDocument();
        expect(screen.queryByTestId('virtuoso-scroller')).not.toBeInTheDocument();
    });

    it('keeps text edits local until blur so typing does not recompute the summary per key', async () => {
        renderDialog();

        await screen.findByDisplayValue('notes 149');
        const summary = screen.getByTestId('total-count-summary');
        expect(summary).toHaveTextContent('Total Games : 150');

        const firstCountField = screen.getAllByTestId('task-history-count')[0];
        fireEvent.change(firstCountField, { target: { value: '10' } });

        expect(summary).toHaveTextContent('Total Games : 150');

        fireEvent.blur(firstCountField);

        expect(summary).toHaveTextContent('Total Games : 159');
    });

    it('maps virtual row edits back to the newest original history item', async () => {
        renderDialog();

        await screen.findByDisplayValue('notes 149');
        const firstCommentField = screen.getAllByLabelText('Comments')[0];
        fireEvent.change(firstCommentField, {
            target: { value: 'changed newest notes' },
        });
        fireEvent.blur(firstCommentField);
        fireEvent.click(screen.getByTestId('task-updater-save-button'));

        expect(mocks.getTimelineUpdate).toHaveBeenCalledTimes(1);
        const [, submittedItems] = mocks.getTimelineUpdate.mock.calls[0] as unknown as [
            unknown,
            { notes: string }[],
        ];
        expect(submittedItems[149].notes).toBe('changed newest notes');
        expect(submittedItems[0].notes).toBe('notes 0');
    });

    it('includes active text drafts when Save is clicked before blur', async () => {
        renderDialog();

        await screen.findByDisplayValue('notes 149');
        const firstCommentField = screen.getAllByLabelText('Comments')[0];
        fireEvent.change(firstCommentField, {
            target: { value: 'changed draft before blur' },
        });

        fireEvent.click(screen.getByTestId('task-updater-save-button'));

        expect(mocks.getTimelineUpdate).toHaveBeenCalledTimes(1);
        const [, submittedItems] = mocks.getTimelineUpdate.mock.calls[0] as unknown as [
            unknown,
            { notes: string }[],
        ];
        expect(submittedItems[149].notes).toBe('changed draft before blur');
    });

    it('builds the save payload once when Save is clicked', async () => {
        renderDialog();

        await screen.findByDisplayValue('notes 149');
        fireEvent.click(screen.getByTestId('task-updater-save-button'));

        expect(mocks.getTimelineUpdate).toHaveBeenCalledTimes(1);
        expect(mocks.onClose).toHaveBeenCalledTimes(1);
    });
});
