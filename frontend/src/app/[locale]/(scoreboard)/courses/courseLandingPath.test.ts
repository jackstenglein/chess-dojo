import { describe, expect, it } from 'vitest';
import { isCourseLandingPath } from './courseLandingPath';

describe('isCourseLandingPath', () => {
    it('matches the public course sales page', () => {
        expect(isCourseLandingPath('/courses/WORKSHOP/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0')).toBe(
            true,
        );
        expect(isCourseLandingPath('/courses/OPENING/course-1/')).toBe(true);
    });

    it('does not match the course list, module player, or admin editor', () => {
        expect(isCourseLandingPath('/courses')).toBe(false);
        expect(isCourseLandingPath('/courses/OPENING')).toBe(false);
        expect(isCourseLandingPath('/courses/OPENING/course-1/0/0')).toBe(false);
        expect(isCourseLandingPath('/admin/courses/OPENING/course-1')).toBe(false);
        expect(isCourseLandingPath('/live-classes')).toBe(false);
    });
});
