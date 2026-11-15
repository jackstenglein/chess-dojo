import { canonicalPath, isStaticVideoPage } from './staticVideoPages';

const COURSE_CONTENT_PATH = /^\/courses\/([^/]+)\/([^/]+)(?:\/([^/]+)\/([^/]+))?$/;

export const COEP_REQUIRE_CORP = 'require-corp';
export const COEP_UNSAFE_NONE = 'unsafe-none';

export type EmbedderPolicy = typeof COEP_REQUIRE_CORP | typeof COEP_UNSAFE_NONE;

export interface CourseVideoRecord {
    intro: boolean;
    modules: ReadonlySet<string>;
}

/** Keyed by `${type}/${id}`. */
export type CourseVideoIndex = ReadonlyMap<string, CourseVideoRecord>;

export interface CourseVideoIndexEntry {
    type: string;
    id: string;
    intro: boolean;
    modules?: string[];
}

export function indexCourseVideos(entries: CourseVideoIndexEntry[]): CourseVideoIndex {
    const index = new Map<string, CourseVideoRecord>();
    for (const entry of entries) {
        index.set(`${entry.type}/${entry.id}`, {
            intro: entry.intro,
            modules: new Set(entry.modules ?? []),
        });
    }
    return index;
}

export function isCourseContentPath(pathname: string): boolean {
    return COURSE_CONTENT_PATH.test(canonicalPath(pathname));
}

/**
 * COEP for a course URL, or null when the path is not a course page.
 *
 * `/courses/{type}/{id}` renders the purchase page for viewers without
 * access and chapter 0 module 0 for everyone else, so it needs unsafe-none
 * when either view embeds a video. A module URL follows that module only.
 * An intro video therefore does not turn off isolation for later engine
 * modules.
 */
export function courseEmbedderPolicy(
    pathname: string,
    index: CourseVideoIndex,
): EmbedderPolicy | null {
    const match = COURSE_CONTENT_PATH.exec(canonicalPath(pathname));
    if (!match) {
        return null;
    }

    const course = index.get(`${match[1]}/${match[2]}`);
    if (!course) {
        return COEP_REQUIRE_CORP;
    }

    const chapter = match[3];
    const moduleIndex = match[4];
    if (chapter === undefined) {
        return course.intro || course.modules.has('0/0') ? COEP_UNSAFE_NONE : COEP_REQUIRE_CORP;
    }

    return course.modules.has(`${chapter}/${moduleIndex}`) ? COEP_UNSAFE_NONE : COEP_REQUIRE_CORP;
}

export async function embedderPolicyForPath(
    pathname: string,
    loadCourseIndex: () => Promise<CourseVideoIndex>,
): Promise<EmbedderPolicy> {
    if (isStaticVideoPage(pathname)) {
        return COEP_UNSAFE_NONE;
    }
    if (!isCourseContentPath(pathname)) {
        return COEP_REQUIRE_CORP;
    }
    const index = await loadCourseIndex();
    return courseEmbedderPolicy(pathname, index) ?? COEP_REQUIRE_CORP;
}

/**
 * Whether the course page that actually rendered embeds a video.
 * Blocked viewers see the purchase intro on every module URL.
 */
export function coursePageNeedsVideo(input: {
    isBlocked: boolean;
    introVideoUrl?: string;
    moduleVideoUrls?: string[];
}): boolean {
    if (input.isBlocked) {
        return Boolean(input.introVideoUrl?.trim());
    }
    return Boolean(input.moduleVideoUrls?.some((url) => url.trim()));
}
