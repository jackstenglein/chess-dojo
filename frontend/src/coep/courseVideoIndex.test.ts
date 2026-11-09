import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCourseVideoIndex, resetCourseVideoIndexCache } from './courseVideoIndex';

describe('getCourseVideoIndex', () => {
    afterEach(() => {
        resetCourseVideoIndexCache();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('fetches the public index once and reuses it inside the ttl', async () => {
        vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.com/');
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({
                    courses: [{ type: 'OPENING', id: 'course', intro: true, modules: ['0/0'] }],
                }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
        const first = await getCourseVideoIndex();
        const second = await getCourseVideoIndex();

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
            'https://api.example.com/public/courses/video-index',
        );
        expect(first.get('OPENING/course')?.intro).toBe(true);
        expect(first.get('OPENING/course')?.modules.has('0/0')).toBe(true);
        expect(second).toBe(first);

        now.mockReturnValue(1_000 + 60_000);
        await getCourseVideoIndex();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
