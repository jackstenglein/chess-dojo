import { z } from 'zod';

/** The username of the blog owner for the Chess Dojo blog. */
export const DOJO_BLOG_OWNER = 'chessdojo';

/** Blog post status. */
export const BlogStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);
/** Blog post status values (e.g. BlogStatuses.DRAFT, BlogStatuses.PUBLISHED). */
export const BlogStatuses = BlogStatusSchema.enum;
/** Blog post status type. */
export type BlogStatus = z.infer<typeof BlogStatusSchema>;

/** Verifies the shape of a Blog. */
export const BlogSchema = z.object({
    /** The username of the blog owner. */
    owner: z.string(),
    /** The unique id of the blog post. */
    id: z.string(),
    /** The markdown content of the blog post. */
    content: z.string(),
    /** The publication or display date of the blog post (ISO date string). */
    date: z.string(),
    /** The title of the blog post. */
    title: z.string(),
    /** The subtitle of the blog post. */
    subtitle: z.string(),
    /** Short overview of what the blog post is about (used in metadata and in list preview). */
    description: z.string(),
    /** Optional URL of a cover image (used in list preview and Open Graph). */
    coverImage: z.url().optional(),
    /** When the blog post was created (ISO date string). */
    createdAt: z.string(),
    /** When the blog post was last updated (ISO date string). */
    updatedAt: z.string(),
    /** The status of the blog post. */
    status: BlogStatusSchema,
    /** Comments on the blog post. */
    comments: z.array(z.any()).nullish(),
});

/** A blog post. */
export type Blog = z.infer<typeof BlogSchema>;

/** Verifies the type of a request to create a blog post. */
export const createBlogRequestSchema = z.object({
    /** The URL slug of the blog post (used as the id and in the page URL, e.g. /blog/your-slug). */
    id: z.string(),
    /** The title of the blog post. */
    title: z.string(),
    /** The subtitle of the blog post. */
    subtitle: z.string(),
    /** Short overview of what the blog post is about (used in metadata and in list preview). */
    description: z.string(),
    /** Optional URL of a cover image (used in list preview / Open Graph). */
    coverImage: z.url().optional(),
    /** The publication or display date (ISO date string). */
    date: z.string(),
    /** The markdown content of the blog post. */
    content: z.string(),
    /** The status of the blog post. Defaults to DRAFT if omitted. */
    status: BlogStatusSchema.optional(),
});

/** A request to create a blog post. */
export type CreateBlogRequest = z.infer<typeof createBlogRequestSchema>;

/** Verifies the type of a request to get a blog post. */
export const getBlogRequestSchema = z.object({
    /** The username of the blog owner. */
    owner: z.string(),
    /** The id of the blog post to get. */
    id: z.string(),
});

/** A request to get a blog post. */
export type GetBlogRequest = z.infer<typeof getBlogRequestSchema>;

/** Verifies the type of a request to list blog posts by owner. */
export const listBlogsRequestSchema = z.object({
    /** The username of the blog owner. */
    owner: z.string(),
    /** Optional limit on the number of items to return. */
    limit: z.coerce.number().int().min(1).max(100).optional(),
    /** Optional pagination token (opaque string from previous response). */
    startKey: z.string().optional(),
});

/** A request to list blog posts by owner (descending by date). */
export type ListBlogsRequest = z.infer<typeof listBlogsRequestSchema>;

/** Verifies the type of a request to update a blog post. */
export const updateBlogRequestSchema = z.object({
    /** The username of the blog owner. */
    owner: z.string(),
    /** The id of the blog post to update. */
    id: z.string(),
    /** The title of the blog post. */
    title: z.string().optional(),
    /** The subtitle of the blog post. */
    subtitle: z.string().optional(),
    /** Short overview of what the blog post is about (used in metadata). */
    description: z.string().optional(),
    /** Optional URL of a cover image (used in metadata / Open Graph). */
    coverImage: z.url().optional(),
    /** The publication or display date (ISO date string). */
    date: z.string().optional(),
    /** The markdown content of the blog post. */
    content: z.string().optional(),
    /** The status of the blog post. */
    status: BlogStatusSchema.optional(),
});

/** A request to update a blog post. */
export type UpdateBlogRequest = z.infer<typeof updateBlogRequestSchema>;

/** Verifies the type of a request to create a comment on a blog post. */
export const createBlogCommentRequestSchema = z.object({
    /** The username of the blog owner. */
    owner: z.string(),
    /** The id of the blog post. */
    id: z.string(),
    /** The text content of the comment. */
    content: z.string().min(1),
});

/** A request to create a comment on a blog post. */
export type CreateBlogCommentRequest = z.infer<typeof createBlogCommentRequestSchema>;
