import { describe, expect, it, vi } from 'vitest';
import {
    COEP_REQUIRE_CORP,
    COEP_UNSAFE_NONE,
    courseEmbedderPolicy,
    coursePageNeedsVideo,
    embedderPolicyForPath,
    indexCourseVideos,
    isCourseContentPath,
} from './courseCoep';

const index = indexCourseVideos([
    {
        type: 'OPENING',
        id: 'mixed',
        intro: true,
        modules: ['0/0', '2/1'],
    },
    {
        type: 'ENDGAME',
        id: 'engine',
        intro: false,
        modules: [],
    },
]);

describe('courseEmbedderPolicy', () => {
    it('uses unsafe-none for an intro or a video module', () => {
        expect(courseEmbedderPolicy('/courses/OPENING/mixed', index)).toBe(COEP_UNSAFE_NONE);
        expect(courseEmbedderPolicy('/de/courses/OPENING/mixed/2/1', index)).toBe(COEP_UNSAFE_NONE);
    });

    it('keeps require-corp on engine modules even when the course has an intro', () => {
        expect(courseEmbedderPolicy('/courses/OPENING/mixed/1/0', index)).toBe(COEP_REQUIRE_CORP);
    });

    it('keeps require-corp for an engine course and an unknown course', () => {
        expect(courseEmbedderPolicy('/courses/ENDGAME/engine', index)).toBe(COEP_REQUIRE_CORP);
        expect(courseEmbedderPolicy('/courses/ENDGAME/engine/0/0', index)).toBe(COEP_REQUIRE_CORP);
        expect(courseEmbedderPolicy('/courses/OPENING/missing/0/0', index)).toBe(COEP_REQUIRE_CORP);
    });

    it('ignores paths that are not a course', () => {
        expect(isCourseContentPath('/courses')).toBe(false);
        expect(courseEmbedderPolicy('/blog/post', index)).toBeNull();
    });
});

describe('embedderPolicyForPath', () => {
    it('does not load the course index for static video pages or engine pages', async () => {
        const loadCourseIndex = vi.fn();
        await expect(embedderPolicyForPath('/blog/post', loadCourseIndex)).resolves.toBe(
            COEP_UNSAFE_NONE,
        );
        await expect(embedderPolicyForPath('/games/analysis', loadCourseIndex)).resolves.toBe(
            COEP_REQUIRE_CORP,
        );
        expect(loadCourseIndex).not.toHaveBeenCalled();
    });

    it('loads the course index for a course module', async () => {
        const loadCourseIndex = vi.fn().mockResolvedValue(index);
        await expect(
            embedderPolicyForPath('/courses/OPENING/mixed/2/1', loadCourseIndex),
        ).resolves.toBe(COEP_UNSAFE_NONE);
        expect(loadCourseIndex).toHaveBeenCalledOnce();
    });
});

describe('coursePageNeedsVideo', () => {
    it('follows the purchase intro when the viewer is blocked', () => {
        expect(
            coursePageNeedsVideo({
                isBlocked: true,
                introVideoUrl: ' https://youtu.be/intro ',
                moduleVideoUrls: [],
            }),
        ).toBe(true);
        expect(
            coursePageNeedsVideo({
                isBlocked: true,
                introVideoUrl: '   ',
                moduleVideoUrls: ['https://youtu.be/module'],
            }),
        ).toBe(false);
    });

    it('follows the rendered module when the viewer has access', () => {
        expect(
            coursePageNeedsVideo({
                isBlocked: false,
                introVideoUrl: 'https://youtu.be/intro',
                moduleVideoUrls: ['  '],
            }),
        ).toBe(false);
        expect(
            coursePageNeedsVideo({
                isBlocked: false,
                moduleVideoUrls: ['https://youtu.be/module'],
            }),
        ).toBe(true);
    });
});
