import { Coach, Course, CourseModule, CourseModuleType, CourseType } from '@/database/course';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CourseContentPreview, resolveModule } from './CourseContentPreview';

vi.mock('@/app/[locale]/(scoreboard)/courses/[type]/[id]/[chapter]/[module]/Module', () => ({
    default: ({ module }: { module: CourseModule }) => (
        <div data-testid='module-preview'>{module.name || 'Untitled module'}</div>
    ),
}));

vi.mock('@/components/navigation/Link', () => ({
    Link: ({ href, children }: { href: string; children: ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

function makeModule(overrides: Partial<CourseModule> = {}): CourseModule {
    return {
        id: 'mod-1',
        name: 'Video 1',
        type: CourseModuleType.Video,
        description: '',
        postscript: '',
        videoUrls: [],
        pgns: [],
        coach: Coach.Jesse,
        positions: [],
        boardOrientation: 'white',
        ...overrides,
    };
}

function makeCourse(overrides: Partial<Course> = {}): Course {
    return {
        owner: 'admin',
        ownerDisplayName: 'Admin',
        stripeId: '',
        type: CourseType.Opening,
        id: 'course-1',
        name: 'Italian Game',
        description: '',
        color: 'White',
        cohorts: ['1200-1300'],
        cohortRange: '1200-1300',
        includedWithSubscription: false,
        availableForFreeUsers: true,
        chapters: [
            {
                name: 'Introduction',
                modules: [
                    makeModule({ id: 'a', name: 'Welcome' }),
                    makeModule({ id: 'b', name: 'First ideas' }),
                ],
            },
            {
                name: 'Main lines',
                modules: [makeModule({ id: 'c', name: 'Two Knights' })],
            },
        ],
        ...overrides,
    };
}

afterEach(cleanup);

describe('CourseContentPreview', () => {
    it('shows an empty state when there are no modules', () => {
        render(<CourseContentPreview course={makeCourse({ chapters: [] })} />);
        expect(
            screen.getByText('Add chapters and modules in the Content tab to preview them here.'),
        ).toBeInTheDocument();
    });

    it('renders the course name, cohort range, and first module', () => {
        render(<CourseContentPreview course={makeCourse()} />);
        expect(screen.getByRole('heading', { name: 'Italian Game' })).toBeInTheDocument();
        expect(screen.getByText('1200-1300')).toBeInTheDocument();
        expect(screen.getByTestId('module-preview')).toHaveTextContent('Welcome');
    });

    it('falls back to Untitled course when the name is empty', () => {
        render(<CourseContentPreview course={makeCourse({ name: '' })} />);
        expect(screen.getByRole('heading', { name: 'Untitled course' })).toBeInTheDocument();
    });

    it('navigates to the next and previous modules', () => {
        render(<CourseContentPreview course={makeCourse()} />);
        expect(screen.getByTestId('module-preview')).toHaveTextContent('Welcome');

        fireEvent.click(screen.getByRole('button', { name: 'Next: First ideas' }));
        expect(screen.getByTestId('module-preview')).toHaveTextContent('First ideas');

        fireEvent.click(screen.getByRole('button', { name: 'Next: Two Knights' }));
        expect(screen.getByTestId('module-preview')).toHaveTextContent('Two Knights');
        expect(screen.queryByRole('button', { name: /Next:/ })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Previous: First ideas' }));
        expect(screen.getByTestId('module-preview')).toHaveTextContent('First ideas');
    });

    it('selects a module from the table of contents', () => {
        render(<CourseContentPreview course={makeCourse()} />);
        fireEvent.click(screen.getByRole('button', { name: /Two Knights/ }));
        expect(screen.getByTestId('module-preview')).toHaveTextContent('Two Knights');
    });
});

describe('resolveModule', () => {
    const chapters = makeCourse().chapters;

    it('returns undefined when chapters are missing or have no modules', () => {
        expect(resolveModule(undefined, 0, 0)).toBeUndefined();
        expect(resolveModule([], 0, 0)).toBeUndefined();
        expect(resolveModule([{ name: 'Empty', modules: [] }], 0, 0)).toBeUndefined();
    });

    it('returns the selected module when it exists', () => {
        expect(resolveModule(chapters, 0, 1)).toMatchObject({
            chapterIndex: 0,
            moduleIndex: 1,
            module: { name: 'First ideas' },
        });
    });

    it('clamps an out-of-range module index within the selected chapter', () => {
        expect(resolveModule(chapters, 0, 99)).toMatchObject({
            chapterIndex: 0,
            moduleIndex: 1,
            module: { name: 'First ideas' },
        });
    });

    it('clamps an out-of-range chapter index', () => {
        expect(resolveModule(chapters, 99, 0)).toMatchObject({
            chapterIndex: 1,
            moduleIndex: 0,
            module: { name: 'Two Knights' },
        });
    });

    it('falls back to the first chapter that has a module', () => {
        const withEmpty = [
            { name: 'Empty', modules: [] },
            { name: 'Intro', modules: [makeModule({ name: 'Only' })] },
        ];
        expect(resolveModule(withEmpty, 0, 0)).toMatchObject({
            chapterIndex: 1,
            moduleIndex: 0,
            module: { name: 'Only' },
        });
    });
});
