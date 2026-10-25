const COURSE_STORAGE_KEY = 'COURSE_CHECKOUT_IDS';

export function getCheckoutSessionId(courseId?: string): string {
    if (!courseId) {
        return '';
    }

    const courseCheckoutStr = localStorage.getItem(COURSE_STORAGE_KEY);
    if (!courseCheckoutStr) {
        return '';
    }

    const checkoutSessionIds = JSON.parse(courseCheckoutStr) as Record<string, string>;
    return checkoutSessionIds[courseId] || '';
}

export function setCheckoutSessionId(courseId?: string, checkoutId?: string) {
    if (!courseId || !checkoutId) {
        return;
    }

    const courseCheckoutStr = localStorage.getItem(COURSE_STORAGE_KEY);
    let checkoutSessionIds: Record<string, string> = {};
    try {
        if (courseCheckoutStr) {
            checkoutSessionIds = JSON.parse(courseCheckoutStr) as Record<string, string>;
        }
    } catch {
        // Continue with empty checkout session IDs object
    }
    checkoutSessionIds[courseId] = checkoutId;
    localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(checkoutSessionIds));
}

export function getAllCheckoutSessionIds(): Record<string, string> {
    const courseCheckoutStr = localStorage.getItem(COURSE_STORAGE_KEY);
    if (!courseCheckoutStr) {
        return {};
    }
    try {
        return JSON.parse(courseCheckoutStr) as Record<string, string>;
    } catch {
        return {};
    }
}

export function clearCheckoutSessionIds() {
    localStorage.removeItem(COURSE_STORAGE_KEY);
}
