import { AxiosResponse } from 'axios';
import { Course } from '../database/course';
import { axiosService } from './axiosService';

/**
 * CourseApiContextType provides an API for interacting with Courses.
 */
export interface CourseApiContextType {
    /**
     * getCourse returns the course with the provided type and id.
     * @param type The type of the course.
     * @param id The id of the course.
     * @param checkoutId The Stripe checkout session id of the purchase for anonymous users.
     * @returns An AxiosResponse containing the requested course.
     */
    getCourse: (
        type: string,
        id: string,
        checkoutId?: string,
    ) => Promise<AxiosResponse<GetCourseResponse>>;

    /**
     * listCourses returns a list of all courses with the provided type.
     * @param type The type of the course.
     * @param startKey The optional start key to use when searching.
     * @returns A list of all courses with the provided type.
     */
    listCourses: (type: string, startKey?: string) => Promise<Course[]>;

    /**
     * listAllCourses returns a list of all published courses.
     * @param startKey The optional start key to use when searching.
     * @returns A list of all published courses.
     */
    listAllCourses: (startKey?: string) => Promise<Course[]>;

    /**
     * Fetches a Stripe Checkout Session URL that can be used to purchase the course.
     * @param type The type of the course.
     * @param id The id of the course.
     * @param purchaseOption The name of the purchase option to use.
     * @param cancelUrl The URL to return to when cancelling the checkout.
     * @returns An AxiosResponse containing the Checkout URL.
     */
    purchaseCourse: (
        type: string,
        id: string,
        purchaseOption?: string,
        cancelUrl?: string,
    ) => Promise<AxiosResponse<PurchaseCourseResponse>>;

    /**
     * setCourse saves the provided Course to the database and returns the final version.
     * @param course The Course to save.
     * @returns An AxiosResponse containing the Course as saved in the database.
     */
    setCourse: (course: Course) => Promise<AxiosResponse<Course>>;
}

/** A response to a getCourse request. */
export interface GetCourseResponse {
    /** The requested Course. */
    course: Course;

    /**
     * Whether the user is blocked from viewing this course due to missing purchases.
     * If true, the course's chapters attribute will be null.
     */
    isBlocked: boolean;
}

/**
 * getCourse returns the course with the provided type and id.
 * @param idToken The id token of the current signed-in user.
 * @param type The type of the course.
 * @param id The id of the course.
 * @param checkoutId The Stripe checkout session id of the purchase for anonymous users.
 * @returns An AxiosResponse containing the requested course.
 */
export function getCourse(idToken: string, type: string, id: string, checkoutId?: string) {
    if (idToken) {
        return axiosService.get<GetCourseResponse>(`/courses/${type}/${id}`, {
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
            functionName: 'getCourse',
        });
    }

    return axiosService.get<GetCourseResponse>(
        `/public/courses/${type}/${id}?checkoutId=${checkoutId}`,
        {
            functionName: 'getCourse',
        },
    );
}

interface ListCoursesResponse {
    courses: Course[];
    lastEvaluatedKey: string;
}

/**
 * listCourses returns a list of all courses with the provided type.
 * @param idToken The id token of the current signed-in user.
 * @param type The type of the course.
 * @param startKey The optional start key to use when searching.
 * @returns A list of all courses with the provided type.
 */
export async function listCourses(idToken: string, type: string, startKey?: string) {
    const params = { startKey };
    const result: Course[] = [];

    do {
        const resp = await axiosService.get<ListCoursesResponse>(`/courses/${type}`, {
            params,
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
            functionName: 'listCourses',
        });

        result.push(...resp.data.courses);
        params.startKey = resp.data.lastEvaluatedKey;
    } while (params.startKey);

    return result;
}

/**
 * listAllCourses returns a list of all courses.
 * @param startKey The optional start key to use when searching.
 * @returns A list of all courses.
 */
export async function listAllCourses(startKey?: string) {
    const params = { startKey };
    const result: Course[] = [];

    do {
        const resp = await axiosService.get<ListCoursesResponse>(`/public/courses`, {
            params,
            functionName: 'listAllCourses',
        });

        result.push(...resp.data.courses);
        params.startKey = resp.data.lastEvaluatedKey;
    } while (params.startKey);

    return result;
}

/**
 * listAdminCourses returns all courses, including drafts. Requires an admin JWT.
 */
export async function listAdminCourses(startKey?: string) {
    const params = { startKey };
    const result: Course[] = [];

    do {
        const resp = await axiosService.get<ListCoursesResponse>(`/courses`, {
            params,
            functionName: 'listAdminCourses',
        });

        result.push(...resp.data.courses);
        params.startKey = resp.data.lastEvaluatedKey;
    } while (params.startKey);

    return result;
}

export interface PurchaseCourseResponse {
    /** The Stripe Checkout Session URL. */
    url: string;
}

/**
 * Fetches a Stripe Checkout Session URL that can be used to purchase the provided course.
 * @param idToken The id token of the current signed-in user.
 * @param type The type of the course to purchase.
 * @param id The id of the course to purchase.
 * @param purchaseOption The name of the purchase option to use.
 * @param cancelUrl The URL to return to when cancelling the checkout.
 * @returns An AxiosResponse containing the Checkout URL.
 */
export function purchaseCourse(
    idToken: string,
    type: string,
    id: string,
    purchaseOption?: string,
    cancelUrl?: string,
) {
    const url = idToken
        ? `/courses/${type}/${id}/purchase`
        : `/public/courses/${type}/${id}/purchase`;

    const headers = idToken
        ? {
              Authorization: 'Bearer ' + idToken,
          }
        : undefined;

    return axiosService.get<PurchaseCourseResponse>(url, {
        params: { purchaseOption, cancelUrl },
        headers,
        functionName: 'purchaseCourse',
    });
}

/**
 * setCourse saves the provided Course to the database and returns the final version.
 * @param idToken The id token of the current signed-in user.
 * @param course The Course to save.
 * @returns An AxiosResponse containing the Course as saved in the database.
 */
export function setCourse(idToken: string, course: Course) {
    return axiosService.put<Course>(`/courses`, course, {
        headers: { Authorization: 'Bearer ' + idToken },
        functionName: 'setCourse',
    });
}
