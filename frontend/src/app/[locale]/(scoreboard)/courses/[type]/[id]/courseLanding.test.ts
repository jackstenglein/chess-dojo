import { Course, CourseStatus, CourseType } from '@/database/course';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    courseLandingMetadata,
    coursePreviewTitle,
    getPublicCourse,
    publicCourseView,
} from './courseLanding';

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
}));

vi.mock('@/api/axiosService', () => ({
    axiosService: { get: mocks.get },
}));

function course(overrides: Partial<Course> = {}): Course {
    return {
        owner: 'eugene',
        ownerDisplayName: 'GM Eugene Perelshteyn',
        stripeId: 'acct_123',
        type: CourseType.Workshop,
        id: 'dragon',
        name: 'Accelerated Dragon',
        description: 'A complete Accelerated Dragon repertoire.',
        color: 'Black',
        cohorts: ['1400-1500'],
        cohortRange: '1400-2000',
        includedWithSubscription: false,
        availableForFreeUsers: true,
        imageUrl: 'https://cdn.example.com/dragon.jpg',
        status: CourseStatus.Published,
        chapters: [
            {
                name: 'Paid chapter',
                modules: [],
            },
        ],
        ...overrides,
    };
}

describe('coursePreviewTitle', () => {
    it('includes the coach in the preview title', () => {
        expect(coursePreviewTitle(course())).toBe('Accelerated Dragon w/ GM Eugene Perelshteyn');
    });

    it('uses the course name when the coach is blank', () => {
        expect(coursePreviewTitle(course({ ownerDisplayName: '  ' }))).toBe('Accelerated Dragon');
    });
});

describe('courseLandingMetadata', () => {
    it('sets the title, description, canonical URL, and social preview tags', () => {
        const metadata = courseLandingMetadata(course());

        expect(metadata.title).toBe('Accelerated Dragon w/ GM Eugene Perelshteyn');
        expect(metadata.description).toBe('A complete Accelerated Dragon repertoire.');
        expect(metadata.alternates).toEqual({ canonical: '/courses/WORKSHOP/dragon' });
        expect(metadata.openGraph).toMatchObject({
            title: 'Accelerated Dragon w/ GM Eugene Perelshteyn',
            description: 'A complete Accelerated Dragon repertoire.',
            url: '/courses/WORKSHOP/dragon',
            images: [
                {
                    url: 'https://cdn.example.com/dragon.jpg',
                    alt: 'Accelerated Dragon w/ GM Eugene Perelshteyn',
                },
            ],
        });
        expect(metadata.twitter).toMatchObject({
            title: 'Accelerated Dragon w/ GM Eugene Perelshteyn',
            description: 'A complete Accelerated Dragon repertoire.',
            images: ['https://cdn.example.com/dragon.jpg'],
        });
    });

    it('omits an image tag when the course has no thumbnail', () => {
        const metadata = courseLandingMetadata(course({ imageUrl: '  ' }));
        expect(metadata.openGraph).not.toHaveProperty('images');
        expect(metadata.twitter).not.toHaveProperty('images');
    });
});

describe('publicCourseView', () => {
    it('removes chapter content from the public view', () => {
        expect(publicCourseView(course()).chapters).toBeUndefined();
        expect(publicCourseView(course()).name).toBe('Accelerated Dragon');
    });
});

describe('getPublicCourse', () => {
    beforeEach(() => {
        mocks.get.mockReset();
    });

    it('requests the public course endpoint', async () => {
        mocks.get.mockResolvedValue({
            data: { course: course({ id: 'public-1' }), isBlocked: true },
        });

        const response = await getPublicCourse('WORKSHOP', 'public-1');

        expect(mocks.get).toHaveBeenCalledWith('/public/courses/WORKSHOP/public-1', {
            functionName: 'getPublicCourse',
        });
        expect(response?.isBlocked).toBe(true);
        expect(response?.course.name).toBe('Accelerated Dragon');
    });

    it('returns null when the course does not exist', async () => {
        mocks.get.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });

        await expect(getPublicCourse('OPENING', 'missing-course')).resolves.toBeNull();
    });
});
