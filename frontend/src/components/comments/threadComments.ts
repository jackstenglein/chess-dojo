import { Comment } from '@jackstenglein/chess-dojo-common/src/database/timeline';

export interface CommentThread {
    root: Comment;
    replies: Comment[];
}

/**
 * Groups a flat array of comments into threads. Top-level comments (no parentId)
 * become roots. Replies are grouped under their parentId root. Orphaned replies
 * (parent deleted) are promoted to top-level. Threads and replies are sorted
 * by createdAt ascending.
 */
export function groupCommentsIntoThreads(comments: Comment[]): CommentThread[] {
    const topLevel: Comment[] = [];
    const repliesByParent = new Map<string, Comment[]>();
    const commentIds = new Set(comments.map((c) => c.id));

    for (const comment of comments) {
        if (!comment.parentId || !commentIds.has(comment.parentId)) {
            topLevel.push(comment);
        } else {
            const list = repliesByParent.get(comment.parentId) ?? [];
            list.push(comment);
            repliesByParent.set(comment.parentId, list);
        }
    }

    topLevel.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return topLevel.map((root) => {
        const replies = repliesByParent.get(root.id) ?? [];
        replies.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return { root, replies };
    });
}
