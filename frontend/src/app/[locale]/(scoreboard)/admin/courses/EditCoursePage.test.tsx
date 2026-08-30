import { Coach, Course, CourseModuleType, CourseStatus, CourseType } from '@/database/course';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditCoursePage } from './EditCoursePage';

const mocks = vi.hoisted(() => ({
    api: {
        getCourse: vi.fn(),
        setCourse: vi.fn(),
    },
    router: {
        push: vi.fn(),
    },
    auth: {
        status: 'Authenticated',
        user: {
            username: 'admin',
            displayName: 'Admin User',
            isAdmin: true,
        },
    },
}));

vi.mock('@/api/Api', () => ({
    useApi: () => mocks.api,
}));

vi.mock('@/auth/Auth', () => ({
    AuthStatus: { Loading: 'Loading', Authenticated: 'Authenticated' },
    useAuth: () => mocks.auth,
}));

vi.mock('@/hooks/useRouter', () => ({
    useRouter: () => mocks.router,
}));

vi.mock('@/components/navigation/Link', () => ({
    Link: ({ href, children }: { href: string; children: ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/components/ui/CohortSelect', () => ({
    CohortSelect: ({
        selected,
        setSelected,
    }: {
        selected: string[];
        setSelected: (cohorts: string[]) => void;
    }) => (
        <button type='button' onClick={() => setSelected(['1200-1300'])}>
            Cohorts: {selected.join(', ') || 'none'}
        </button>
    ),
}));

vi.mock(
    '@/app/[locale]/(scoreboard)/courses/[type]/[id]/[chapter]/[module]/PurchaseCoursePage',
    () => ({
        default: ({ course }: { course: Course }) => (
            <div data-testid='purchase-preview'>{course.name || 'Untitled course'}</div>
        ),
    }),
);

vi.mock('./CourseContentPreview', () => ({
    CourseContentPreview: ({ course }: { course: Course }) => (
        <div data-testid='content-preview'>{course.name || 'Untitled course'}</div>
    ),
}));

vi.mock('./ContentEditor', () => ({
    ContentEditor: () => <div data-testid='content-editor' />,
}));

const theme = createTheme();

function renderPage(ui: ReactElement) {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

function nameField() {
    return screen.getByRole('textbox', { name: /^name/i });
}

function savedCourse(overrides: Partial<Course> = {}): Course {
    return {
        owner: 'admin',
        ownerDisplayName: 'Admin User',
        stripeId: '',
        type: CourseType.Opening,
        id: 'course-1',
        name: 'Italian Game',
        description: 'A complete repertoire.',
        whatsIncluded: ['Videos'],
        color: 'White',
        cohorts: ['1200-1300'],
        cohortRange: '1200-1300',
        includedWithSubscription: false,
        availableForFreeUsers: true,
        purchaseOptions: [{ name: 'Full', fullPrice: 4900, currentPrice: 0, sellingPoints: [] }],
        chapters: [
            {
                name: 'Intro',
                modules: [
                    {
                        id: 'm1',
                        name: 'Welcome',
                        type: CourseModuleType.Video,
                        description: '',
                        postscript: '',
                        videoUrls: ['https://youtu.be/abc'],
                        pgns: [],
                        coach: Coach.Jesse,
                        positions: [],
                        boardOrientation: 'white',
                    },
                ],
            },
        ],
        imageUrl: '',
        videoUrl: '',
        status: CourseStatus.Draft,
        ...overrides,
    };
}

afterEach(cleanup);

beforeEach(() => {
    mocks.api.getCourse.mockReset();
    mocks.api.setCourse.mockReset();
    mocks.router.push.mockReset();
    mocks.auth.status = 'Authenticated';
    mocks.auth.user = {
        username: 'admin',
        displayName: 'Admin User',
        isAdmin: true,
    };
});

describe('EditCoursePage', () => {
    it('shows a loading page for non-admins', () => {
        mocks.auth.user.isAdmin = false;
        renderPage(<EditCoursePage />);
        expect(screen.queryByText('Create course')).not.toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders the create form for admins', () => {
        renderPage(<EditCoursePage />);
        expect(screen.getByText('Create course')).toBeInTheDocument();
        expect(screen.getByText('Draft')).toBeInTheDocument();
        expect(nameField()).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    });

    it('loads an existing course in edit mode', async () => {
        mocks.api.getCourse.mockResolvedValue({ data: { course: savedCourse() } });
        renderPage(<EditCoursePage type='OPENING' id='course-1' />);

        expect(await screen.findByText('Edit course')).toBeInTheDocument();
        expect(nameField()).toHaveValue('Italian Game');
        expect(screen.getByText('Draft')).toBeInTheDocument();
        expect(mocks.api.getCourse).toHaveBeenCalledWith('OPENING', 'course-1');
    });

    it('shows an error when the course cannot be loaded', async () => {
        mocks.api.getCourse.mockRejectedValue(new Error('not found'));
        renderPage(<EditCoursePage type='OPENING' id='missing' />);
        expect(await screen.findByText('Course not found')).toBeInTheDocument();
    });

    it('requires a name before saving a draft', () => {
        renderPage(<EditCoursePage />);
        fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(mocks.api.setCourse).not.toHaveBeenCalled();
    });

    it('saves a draft and redirects to the edit URL', async () => {
        mocks.api.setCourse.mockResolvedValue({
            data: savedCourse({ id: 'new-id', status: CourseStatus.Draft }),
        });
        renderPage(<EditCoursePage />);
        fireEvent.change(nameField(), { target: { value: 'Italian Game' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

        await waitFor(() => expect(mocks.api.setCourse).toHaveBeenCalled());
        expect(mocks.api.setCourse.mock.calls[0][0]).toMatchObject({
            name: 'Italian Game',
            status: CourseStatus.Draft,
            owner: 'admin',
        });
        expect(mocks.router.push).toHaveBeenCalledWith('/admin/courses/OPENING/new-id');
    });

    it('blocks publish when required fields are missing', () => {
        renderPage(<EditCoursePage />);
        fireEvent.change(nameField(), { target: { value: 'Italian Game' } });
        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
        expect(screen.getByText('Description is required to publish')).toBeInTheDocument();
        expect(mocks.api.setCourse).not.toHaveBeenCalled();
    });

    it('publishes a valid course', async () => {
        mocks.api.getCourse.mockResolvedValue({ data: { course: savedCourse() } });
        mocks.api.setCourse.mockResolvedValue({
            data: savedCourse({ status: CourseStatus.Published }),
        });
        renderPage(<EditCoursePage type='OPENING' id='course-1' />);
        expect(await screen.findByText('Edit course')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
        await waitFor(() => expect(mocks.api.setCourse).toHaveBeenCalled());
        expect(mocks.api.setCourse.mock.calls[0][0]).toMatchObject({
            status: CourseStatus.Published,
            name: 'Italian Game',
        });
        expect(await screen.findByText('Published')).toBeInTheDocument();
        expect(mocks.router.push).not.toHaveBeenCalled();
    });

    it('switches to the content and preview tabs', () => {
        renderPage(<EditCoursePage />);
        fireEvent.click(screen.getByRole('tab', { name: 'Content' }));
        expect(screen.getByTestId('content-editor')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
        expect(screen.getByTestId('purchase-preview')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Course content' }));
        expect(screen.getByTestId('content-preview')).toBeInTheDocument();
    });

    it('disables the type select when editing an existing course', async () => {
        mocks.api.getCourse.mockResolvedValue({ data: { course: savedCourse() } });
        renderPage(<EditCoursePage type='OPENING' id='course-1' />);
        const typeSelect = await screen.findByLabelText('Type');
        expect(typeSelect).toHaveAttribute('aria-disabled', 'true');
    });
});
