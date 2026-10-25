/**
 * Public course sales page: /courses/:type/:id.
 * Chapter and module URLs stay signed-in only.
 */
export const COURSE_LANDING_PATH = /^\/courses\/[^/]+\/[^/]+\/?$/;

/**
 * Returns true if the given pathname is a course landing page.
 * @param pathname The pathname to check.
 */
export function isCourseLandingPath(pathname: string): boolean {
    return COURSE_LANDING_PATH.test(pathname);
}
