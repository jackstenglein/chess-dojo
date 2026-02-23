import {
    Blog,
    CreateBlogRequest,
    GetBlogRequest,
    ListBlogsRequest,
    UpdateBlogRequest,
} from '@jackstenglein/chess-dojo-common/src/blog/api';
import { AxiosResponse } from 'axios';
import { axiosService } from './axiosService';

export interface ListBlogsResponse {
    blogs: Blog[];
    lastEvaluatedKey?: string;
}

/**
 * Lists blog posts for an owner in descending order of date.
 * @param request The list request (owner, optional limit, optional startKey).
 * @returns The list of blogs and an optional pagination token.
 */
export function listBlogs({
    owner,
    ...request
}: ListBlogsRequest): Promise<AxiosResponse<ListBlogsResponse>> {
    return axiosService.get<ListBlogsResponse>(`/blog/list/${owner}`, {
        params: request,
        functionName: 'listBlogs',
    });
}

/**
 * Lists public blog posts for an owner in descending order of date (published only).
 * @param request The list request (owner, optional limit, optional startKey).
 * @returns The list of blogs and an optional pagination token.
 */
export function listPublicBlogs({
    owner,
    ...request
}: ListBlogsRequest): Promise<AxiosResponse<ListBlogsResponse>> {
    return axiosService.get<ListBlogsResponse>(`/public/blog/list/${owner}`, {
        params: request,
        functionName: 'listPublicBlogs',
    });
}

/**
 * Fetches a blog post by owner and id.
 * @param request The get blog request (owner, id).
 * @returns The blog post.
 */
export function getBlog(request: GetBlogRequest): Promise<AxiosResponse<Blog>> {
    return axiosService.get<Blog>(`/blog/${request.owner}/${request.id}`, {
        functionName: 'getBlog',
    });
}

/**
 * Fetches a public blog post by owner and id.
 * @param request The get blog request (owner, id).
 * @returns The blog post.
 */
export function getPublicBlog(request: GetBlogRequest): Promise<AxiosResponse<Blog>> {
    return axiosService.get<Blog>(`/public/blog/${request.owner}/${request.id}`, {
        functionName: 'getPublicBlog',
    });
}

/**
 * Creates a new blog post. The caller must be an admin.
 * @param request The create blog request (title, subtitle, date, content, optional status).
 * @returns The created blog post.
 */
export function createBlog(request: CreateBlogRequest): Promise<AxiosResponse<Blog>> {
    return axiosService.post<Blog>('/blog', request, {
        functionName: 'createBlog',
    });
}

/**
 * Updates an existing blog post. The caller must be the owner or an admin.
 * @param request The update blog request (owner, id, and optional title, subtitle, date, content, status).
 * @returns The updated blog post.
 */
export function updateBlog(request: UpdateBlogRequest): Promise<AxiosResponse<Blog>> {
    const { owner, id, ...body } = request;
    return axiosService.put<Blog>(`/blog/${owner}/${id}`, body, {
        functionName: 'updateBlog',
    });
}

export function createBlogComment(
    props: { owner: string; id: string },
    content: string,
): Promise<AxiosResponse<Blog>> {
    return axiosService.post<Blog>(
        `/blog/${props.owner}/${props.id}/comments`,
        { content },
        { functionName: 'createBlogComment' },
    );
}
