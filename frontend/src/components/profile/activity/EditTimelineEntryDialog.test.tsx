import { useApi } from '@/api/Api';
import { useRequirement } from '@/api/cache/requirements';
import { useAuth } from '@/auth/Auth';
import { TimelineEntry } from '@/database/timeline';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditTimelinEntryDialog } from './EditTimelineEntryDialog';

vi.mock('@/api/Api', () => ({ useApi: vi.fn() }));
vi.mock('@/api/cache/requirements', () => ({ useRequirement: vi.fn() }));
vi.mock('@/auth/Auth', () => ({ useAuth: vi.fn() }));
vi.mock('../trainingPlan/ProgressHistoryItem', () => ({
    ProgressHistoryItem: () => null,
}));
vi.mock('../trainingPlan/ProgressHistory', () => ({
    useProgressHistoryEditor: () => ({
        errors: {},
        request: {
            isLoading: () => false,
            isSent: () => false,
            isFailure: () => false,
            status: 'idle',
            data: undefined,
            error: undefined,
            onStart: vi.fn(),
            onSuccess: vi.fn(),
            onFailure: vi.fn(),
            reset: vi.fn(),
        },
        isTimeOnly: false,
        items: [],
        cohortCount: 0,
        cohortTime: 0,
        totalCount: 0,
        totalTime: 0,
        updateItem: vi.fn(),
        updateDraftItem: vi.fn(),
        getDraftItem: () => undefined,
        deleteItem: vi.fn(),
        onSubmit: vi.fn(),
    }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const messages = require('../../../../messages/en.json') as Record<string, unknown>;

function renderWithIntl(ui: React.ReactElement) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextIntlClientProvider } = require('next-intl') as {
        NextIntlClientProvider: React.FC<{
            locale: string;
            messages: Record<string, unknown>;
            children: React.ReactNode;
        }>;
    };
    return render(
        <NextIntlClientProvider locale='en' messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

function makeOrphanedCustomEntry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
    return {
        owner: 'user-1',
        id: 'entry-1',
        ownerDisplayName: 'Test User',
        cohort: '1500-1600',
        requirementId: 'custom-task-1',
        requirementName: 'My deleted task',
        isCustomRequirement: true,
        totalCount: 1,
        previousCount: 0,
        newCount: 1,
        dojoPoints: 0,
        totalDojoPoints: 0,
        minutesSpent: 30,
        totalMinutesSpent: 30,
        date: '2026-06-20T00:00:00Z',
        createdAt: '2026-06-20T00:00:00Z',
        notes: '',
        comments: null,
        reactions: null,
        ...overrides,
    } as TimelineEntry;
}

describe('EditTimelinEntryDialog (orphaned custom task)', () => {
    const updateUserTimeline = vi.fn();
    const onClose = vi.fn();
    const onDeleteEntry = vi.fn();

    beforeEach(() => {
        updateUserTimeline.mockResolvedValue({});
        vi.mocked(useApi).mockReturnValue({
            updateUserTimeline,
        } as unknown as ReturnType<typeof useApi>);
        vi.mocked(useAuth).mockReturnValue({
            user: { customTasks: [], dojoCohort: '1500-1600' },
        } as unknown as ReturnType<typeof useAuth>);
        vi.mocked(useRequirement).mockReturnValue({
            requirement: undefined,
        } as unknown as ReturnType<typeof useRequirement>);
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders the deleted-task dialog when the custom task no longer exists on the user', () => {
        const entry = makeOrphanedCustomEntry();

        renderWithIntl(
            <EditTimelinEntryDialog
                entry={entry}
                onClose={onClose}
                onDeleteEntry={onDeleteEntry}
            />,
        );

        expect(screen.getByText('Delete activity entry?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('calls updateUserTimeline with the entry marked for deletion and notifies the parent on confirm', async () => {
        const entry = makeOrphanedCustomEntry();

        renderWithIntl(
            <EditTimelinEntryDialog
                entry={entry}
                onClose={onClose}
                onDeleteEntry={onDeleteEntry}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(updateUserTimeline).toHaveBeenCalledWith(
                expect.objectContaining({
                    requirementId: 'custom-task-1',
                    deleted: [entry],
                    updated: [],
                }),
            );
        });
        expect(onDeleteEntry).toHaveBeenCalledWith(entry);
        expect(onClose).toHaveBeenCalled();
    });
});
