import { Course, CourseStatus, CourseType } from '@/database/course';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicCourseLanding } from './PublicCourseLanding';

const mocks = vi.hoisted(() => ({
    auth: {
        status: 'Unauthenticated',
        user: undefined as { username: string } | undefined,
    },
    api: {
        getCourse: vi.fn(),
    },
    search: '',
}));

vi.mock('@/auth/Auth', () => ({
    AuthStatus: {
        Loading: 'Loading',
        Authenticated: 'Authenticated',
        Unauthenticated: 'Unauthenticated',
    },
    useAuth: () => mocks.auth,
    useFreeTier: () => true,
}));

vi.mock('@/api/Api', () => ({
    useApi: () => mocks.api,
}));

vi.mock('@/hooks/useRouter', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/navigation', async (importOriginal) => {
    const actual = await importOriginal<typeof import('next/navigation')>();
    return {
        ...actual,
        useSearchParams: () => new URLSearchParams(mocks.search),
    };
});

vi.mock('@/components/navigation/Link', () => ({
    Link: ({ href, children }: { href: string; children: ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('./[chapter]/[module]/CoursePage', () => ({
    CoursePage: () => <div>Member course</div>,
}));

function course(overrides: Partial<Course> = {}): Course {
    return {
        owner: 'eugene',
        ownerDisplayName: 'GM Eugene Perelshteyn',
        stripeId: '',
        type: CourseType.Workshop,
        id: 'dragon',
        name: 'Accelerated Dragon',
        description: 'A complete Accelerated Dragon repertoire.',
        whatsIncluded: ['Video lessons'],
        color: 'Black',
        cohorts: ['1400-1500'],
        cohortRange: '1400-2000',
        includedWithSubscription: false,
        availableForFreeUsers: true,
        imageUrl: 'https://cdn.example.com/dragon.jpg',
        status: CourseStatus.Published,
        ...overrides,
    };
}

function renderLanding(ui: ReactElement) {
    return renderWithIntl(ui);
}

afterEach(cleanup);

beforeEach(() => {
    mocks.auth.status = 'Unauthenticated';
    mocks.auth.user = undefined;
    mocks.search = '';
    mocks.api.getCourse.mockReset();
    localStorage.clear();
});

describe('PublicCourseLanding', () => {
    it('renders the title, coach, and description before auth finishes', () => {
        mocks.auth.status = 'Loading';

        renderLanding(<PublicCourseLanding course={course()} />);

        expect(screen.getByRole('heading', { name: 'Accelerated Dragon' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'GM Eugene Perelshteyn' })).toHaveAttribute(
            'href',
            '/profile/eugene',
        );
        expect(screen.getByText('A complete Accelerated Dragon repertoire.')).toBeTruthy();
        expect(screen.getByRole('img', { name: 'Accelerated Dragon' })).toHaveAttribute(
            'src',
            'https://cdn.example.com/dragon.jpg',
        );
        expect(mocks.api.getCourse).not.toHaveBeenCalled();
        expect(screen.queryByText('Member course')).toBeNull();
    });

    it('stays on the sales page for a logged-out visitor', async () => {
        renderLanding(<PublicCourseLanding course={course()} />);

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Accelerated Dragon' })).toBeTruthy();
        });
        expect(mocks.api.getCourse).not.toHaveBeenCalled();
        expect(screen.queryByText('Member course')).toBeNull();
    });

    it('opens the course when an anonymous checkout already has access', async () => {
        mocks.search = 'checkout=cs_test';
        mocks.api.getCourse.mockResolvedValue({
            data: { course: course(), isBlocked: false },
        });

        renderLanding(<PublicCourseLanding course={course()} />);

        await waitFor(() => {
            expect(screen.getByText('Member course')).toBeTruthy();
        });
        expect(mocks.api.getCourse).toHaveBeenCalledWith('WORKSHOP', 'dragon', 'cs_test');
    });
});
