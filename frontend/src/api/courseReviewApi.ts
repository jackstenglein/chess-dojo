import { axiosService } from './axiosService';

export interface CourseReview {
    username: string;
    displayName: string;
    rating: number;
    review: string;
    updatedAt: string;
    moderationStatus?: 'PENDING' | 'APPROVED';
}
export interface CourseReviewsResponse {
    reviews: CourseReview[];
    ownReview: CourseReview | null;
    canReview: boolean;
    canModerate?: boolean;
    lastEvaluatedKey?: string;
}

export async function getCourseReviews(token: string, type: string, id: string) {
    const url = `${token ? '' : '/public'}/courses/${type}/${id}/reviews`;
    const reviews: CourseReview[] = [];
    let startKey: string | undefined;
    let result: CourseReviewsResponse;
    do {
        const response = await axiosService.get<CourseReviewsResponse>(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: { startKey },
            functionName: 'getCourseReviews',
        });
        result = response.data;
        reviews.push(...result.reviews);
        startKey = result.lastEvaluatedKey;
    } while (startKey);
    return { ...result, reviews };
}

export async function saveCourseReview(
    token: string,
    type: string,
    id: string,
    rating: number,
    review: string,
) {
    return axiosService.put<CourseReview>(
        `/courses/${type}/${id}/reviews`,
        { rating, review },
        {
            headers: { Authorization: `Bearer ${token}` },
            functionName: 'saveCourseReview',
        },
    );
}

export async function deleteCourseReview(
    token: string,
    type: string,
    id: string,
    username?: string,
) {
    return axiosService.delete(`/courses/${type}/${id}/reviews`, {
        params: { username },
        headers: { Authorization: `Bearer ${token}` },
        functionName: 'deleteCourseReview',
    });
}

export function approveCourseReview(
    token: string,
    type: string,
    id: string,
    username: string,
    updatedAt: string,
) {
    return axiosService.patch(
        `/courses/${type}/${id}/reviews`,
        { username, updatedAt },
        {
            headers: { Authorization: `Bearer ${token}` },
            functionName: 'approveCourseReview',
        },
    );
}
