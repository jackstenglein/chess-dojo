import { Course, CourseStatus, CourseType } from '@/database/course';
import { CustomTask, RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { SubscriptionStatus } from '@/database/user';
import { renderWithIntl } from '@/i18n/intl.test';
import { Directory } from '@jackstenglein/chess-dojo-common/src/database/directory';
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

const homeDirectory = {
    owner: 'student',
    id: 'home',
    name: 'Home',
    itemIds: ['kasparov-folder', 'game-1', 'tal-folder'],
    items: {
        'kasparov-folder': {
            type: 'DIRECTORY',
            id: 'kasparov-folder',
            metadata: { name: 'Kasparov games' },
        },
        'game-1': { type: 'OWNED_GAME', id: 'game-1', metadata: { owner: 'student' } },
        'tal-folder': { type: 'DIRECTORY', id: 'tal-folder', metadata: { name: 'Tal games' } },
    },
} as unknown as Directory;

function course(overrides: Partial<Course>): Course {
    return {
        owner: 'coach',
        ownerDisplayName: 'Coach',
        stripeId: '',
        type: CourseType.Opening,
        id: 'course-1',
        name: 'Najdorf Sicilian',
        description: '',
        color: 'Black',
        cohorts: [],
        cohortRange: 'Starter (1200-1800)',
        includedWithSubscription: true,
        availableForFreeUsers: false,
        status: CourseStatus.Published,
        ...overrides,
    };
}

const courses = [
    course({}),
    course({ id: 'course-2', name: 'Caro Kann', status: CourseStatus.Draft }),
    course({
        id: 'study-master-games-1500-1600',
        type: CourseType.Study,
        name: 'Master Games 1500-1600',
        cohortRange: '1500-1600',
    }),
];

const mocks = vi.hoisted(() => ({
    api: {
        updateUser: vi.fn(),
        getDirectory: vi.fn(),
        listAllCourses: vi.fn(),
    },
    auth: {
        user: {
            username: 'student',
            subscriptionStatus: 'SUBSCRIBED',
            customTasks: [] as CustomTask[],
        },
    },
    request: {
        onStart: vi.fn(),
        onSuccess: vi.fn(),
        onFailure: vi.fn(),
        isLoading: () => false,
    },
}));

vi.mock('@/api/Api', () => ({
    useApi: () => mocks.api,
}));

vi.mock('@/api/Request', () => ({
    useRequest: () => mocks.request,
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
        mocks.api.getDirectory
            .mockReset()
            .mockResolvedValue({ data: { directory: homeDirectory } });
        mocks.api.listAllCourses.mockReset().mockResolvedValue(courses);
        mocks.request.onFailure.mockReset();
        mocks.auth.user.customTasks = [task];
        mocks.auth.user.subscriptionStatus = SubscriptionStatus.Subscribed;
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

    it('keeps every material entry of a task that has several', async () => {
        const parts: CustomTask = {
            ...task,
            material: [
                { kind: 'COURSE', courseType: 'STUDY', courseId: 'polgar-1' },
                { kind: 'COURSE', courseType: 'STUDY', courseId: 'polgar-2' },
            ],
        };
        mocks.auth.user.customTasks = [parts];
        renderWithIntl(
            <CustomTaskEditor
                task={parts}
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
        expect(update.customTasks[0].material).toEqual(parts.material);
    });

    async function savedTasks(): Promise<CustomTask[]> {
        await waitFor(() => expect(mocks.api.updateUser).toHaveBeenCalledTimes(1));
        const [update] = mocks.api.updateUser.mock.calls[0] as [{ customTasks: CustomTask[] }];
        return update.customTasks;
    }

    async function openMaterialSelect() {
        const select = screen.getByTestId('custom-task-material-select');
        const combobox = select.querySelector('[role="combobox"]');
        if (!combobox) {
            throw new Error('material select has no combobox');
        }
        await waitFor(() => expect(mocks.api.listAllCourses).toHaveBeenCalledTimes(1));
        fireEvent.mouseDown(combobox);
        await screen.findByRole('option', { name: 'Kasparov games' });
    }

    /** The selectable options. MUI renders the group headers as options without a value. */
    function optionLabels(): (string | null)[] {
        return screen
            .getAllByRole('option')
            .filter((option) => option.hasAttribute('data-value'))
            .map((option) => option.textContent);
    }

    it('lists the home subfolders and the courses the user can open, without study courses', async () => {
        renderWithIntl(
            <CustomTaskEditor open onClose={vi.fn()} initialCategory={RequirementCategory.Games} />,
        );
        await openMaterialSelect();

        const options = optionLabels();
        expect(options).toEqual([
            'None',
            'Kasparov games',
            'Tal games',
            'Najdorf Sicilian (Starter (1200-1800))',
        ]);
        expect(mocks.api.getDirectory).toHaveBeenCalledWith('student', 'home');
        expect(screen.getByText('Your folders')).toBeTruthy();
        expect(screen.getByText('Courses')).toBeTruthy();
    });

    it('saves the chosen folder as the task material', async () => {
        renderWithIntl(
            <CustomTaskEditor open onClose={vi.fn()} initialCategory={RequirementCategory.Games} />,
        );
        fireEvent.change(screen.getByLabelText(/Task Name/), {
            target: { value: 'Tal attacks' },
        });
        await openMaterialSelect();
        fireEvent.click(screen.getByRole('option', { name: 'Tal games' }));
        fireEvent.click(screen.getByTestId('custom-task-submit-button'));

        const saved = await savedTasks();
        expect(saved).toHaveLength(2);
        expect(saved[1].name).toBe('Tal attacks');
        expect(saved[1].material).toEqual([
            { kind: 'DIRECTORY', owner: 'student', directoryId: 'tal-folder' },
        ]);
    });

    it('saves a course as the task material', async () => {
        renderWithIntl(
            <CustomTaskEditor open onClose={vi.fn()} initialCategory={RequirementCategory.Games} />,
        );
        fireEvent.change(screen.getByLabelText(/Task Name/), {
            target: { value: 'Najdorf' },
        });
        await openMaterialSelect();
        fireEvent.click(
            screen.getByRole('option', { name: 'Najdorf Sicilian (Starter (1200-1800))' }),
        );
        fireEvent.click(screen.getByTestId('custom-task-submit-button'));

        const saved = await savedTasks();
        expect(saved[1].material).toEqual([
            { kind: 'COURSE', courseType: 'OPENING', courseId: 'course-1' },
        ]);
    });

    it('drops the material when None is chosen', async () => {
        renderWithIntl(
            <CustomTaskEditor
                task={task}
                open
                onClose={vi.fn()}
                initialCategory={RequirementCategory.Games}
            />,
        );
        await openMaterialSelect();
        fireEvent.click(screen.getByRole('option', { name: 'None' }));
        fireEvent.click(screen.getByTestId('custom-task-submit-button'));

        const saved = await savedTasks();
        expect(saved[0].material).toBeUndefined();
    });

    it('still lists the courses when the folder fetch fails', async () => {
        const error = new Error('directory unavailable');
        mocks.api.getDirectory.mockRejectedValue(error);
        renderWithIntl(
            <CustomTaskEditor open onClose={vi.fn()} initialCategory={RequirementCategory.Games} />,
        );
        await waitFor(() => expect(mocks.request.onFailure).toHaveBeenCalledWith(error));

        const select = screen.getByTestId('custom-task-material-select');
        const combobox = select.querySelector('[role="combobox"]');
        if (!combobox) {
            throw new Error('material select has no combobox');
        }
        fireEvent.mouseDown(combobox);
        await screen.findByRole('option', { name: 'Najdorf Sicilian (Starter (1200-1800))' });
        expect(optionLabels()).toEqual(['None', 'Najdorf Sicilian (Starter (1200-1800))']);
        expect(mocks.request.onFailure).toHaveBeenCalledTimes(1);
    });

    it('keeps material that is not among the options and lists no subscriber course for a free user', async () => {
        mocks.auth.user.subscriptionStatus = SubscriptionStatus.NotSubscribed;
        const elsewhere: CustomTask = {
            ...task,
            material: [{ kind: 'DIRECTORY', owner: 'student', directoryId: 'deleted-folder' }],
        };
        mocks.auth.user.customTasks = [elsewhere];
        renderWithIntl(
            <CustomTaskEditor
                task={elsewhere}
                open
                onClose={vi.fn()}
                initialCategory={RequirementCategory.Games}
            />,
        );
        await openMaterialSelect();
        const options = optionLabels();
        expect(options).toEqual(['None', 'Current selection', 'Kasparov games', 'Tal games']);
        fireEvent.click(screen.getByRole('option', { name: 'Current selection' }));
        fireEvent.click(screen.getByTestId('custom-task-submit-button'));

        const saved = await savedTasks();
        expect(saved[0].material).toEqual(elsewhere.material);
    });
});
