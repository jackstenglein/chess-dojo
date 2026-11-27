import { CustomTask, RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomTaskEditor from './CustomTaskEditor';

const task: CustomTask = {
    id: 'task-1',
    owner: 'student',
    name: 'Study Kasparov',
    description: '',
    counts: { '1500-1600': 5 },
    scoreboardDisplay: ScoreboardDisplay.ProgressBar,
    category: RequirementCategory.Games,
    numberOfCohorts: 1,
    progressBarSuffix: 'Games',
    updatedAt: '2026-09-01T00:00:00.000Z',
    material: [{ kind: 'DIRECTORY', owner: 'student', directoryId: 'kasparov-folder' }],
};

const mocks = vi.hoisted(() => ({
    api: {
        updateUser: vi.fn(),
    },
    auth: {
        user: { username: 'student', customTasks: [] as CustomTask[] },
    },
}));

vi.mock('@/api/Api', () => ({
    useApi: () => mocks.api,
}));

vi.mock('@/api/Request', () => ({
    useRequest: () => ({
        onStart: vi.fn(),
        onSuccess: vi.fn(),
        onFailure: vi.fn(),
        isLoading: () => false,
    }),
    RequestSnackbar: () => null,
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => mocks.auth,
}));

vi.mock('@/components/profile/activity/useTimeline', () => ({
    useTimelineContext: () => ({ resetRequest: vi.fn() }),
}));

vi.mock('@/analytics/events', () => ({
    EventType: { EditNondojoTask: 'EditNondojoTask', CreateNondojoTask: 'CreateNondojoTask' },
    trackEvent: vi.fn(),
}));

vi.mock('@/components/ui/CohortSelect', () => ({
    CohortSelect: () => null,
}));

describe('CustomTaskEditor', () => {
    beforeEach(() => {
        mocks.api.updateUser.mockReset().mockResolvedValue({});
        mocks.auth.user.customTasks = [task];
    });

    afterEach(() => {
        cleanup();
    });

    it('keeps the study material when another field is edited', async () => {
        renderWithIntl(
            <CustomTaskEditor
                task={task}
                open
                onClose={vi.fn()}
                initialCategory={RequirementCategory.Games}
            />,
        );

        fireEvent.change(screen.getByDisplayValue('Study Kasparov'), {
            target: { value: 'Study Kasparov deeply' },
        });
        fireEvent.click(screen.getByTestId('custom-task-submit-button'));

        await waitFor(() => expect(mocks.api.updateUser).toHaveBeenCalledTimes(1));
        const [update] = mocks.api.updateUser.mock.calls[0] as [{ customTasks: CustomTask[] }];
        const saved = update.customTasks;
        expect(saved).toHaveLength(1);
        expect(saved[0].name).toBe('Study Kasparov deeply');
        expect(saved[0].material).toEqual(task.material);
    });
});
