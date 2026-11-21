import { CourseVideoIndex, CourseVideoIndexEntry, indexCourseVideos } from './courseCoep';

const TTL_MS = 60_000;

interface VideoIndexResponse {
    courses: CourseVideoIndexEntry[];
}

let cache: { index: CourseVideoIndex; fetchedAt: number } | null = null;
let inflight: Promise<CourseVideoIndex> | null = null;

export function resetCourseVideoIndexCache() {
    cache = null;
    inflight = null;
}

export async function getCourseVideoIndex(now = Date.now()): Promise<CourseVideoIndex> {
    if (cache && now - cache.fetchedAt < TTL_MS) {
        return cache.index;
    }
    if (cache) {
        void loadCourseVideoIndex().catch(() => undefined);
        return cache.index;
    }
    return loadCourseVideoIndex();
}

async function loadCourseVideoIndex(): Promise<CourseVideoIndex> {
    if (!inflight) {
        inflight = fetchCourseVideoIndex()
            .then((index) => {
                cache = { index, fetchedAt: Date.now() };
                return index;
            })
            .finally(() => {
                inflight = null;
            });
    }
    return inflight;
}

async function fetchCourseVideoIndex(): Promise<CourseVideoIndex> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');
    if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
    }

    const response = await fetch(`${baseUrl}/public/courses/video-index`);
    if (!response.ok) {
        throw new Error(`course video index responded ${response.status}`);
    }

    const body = (await response.json()) as VideoIndexResponse;
    return indexCourseVideos(body.courses ?? []);
}
