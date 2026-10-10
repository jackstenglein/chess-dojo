import { GetCourseResponse } from '@/api/courseApi';
import { Course } from '@/database/course';
import { AxiosResponse } from 'axios';

/**
 * The cache keeps each course for the tab's lifetime, so a second visit does not fetch it
 * again.
 */
const courses = new Map<string, Course>();

interface CourseApi {
    getCourse: (type: string, id: string) => Promise<AxiosResponse<GetCourseResponse>>;
}

export async function loadCourse(
    api: CourseApi,
    type: string,
    id: string,
): Promise<GetCourseResponse> {
    const key = `${type}/${id}`;
    const hit = courses.get(key);
    if (hit) {
        return { course: hit, isBlocked: false };
    }
    const resp = await api.getCourse(type, id);
    if (!resp.data.isBlocked && resp.data.course) {
        courses.set(key, resp.data.course);
    }
    return resp.data;
}

export function clearCourseCache() {
    courses.clear();
}
