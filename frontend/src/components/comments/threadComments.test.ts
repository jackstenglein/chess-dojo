import { Comment } from '@jackstenglein/chess-dojo-common/src/database/timeline';
import { describe, expect, it } from 'vitest';
import { groupCommentsIntoThreads } from './threadComments';

/** Factory helper — each test only specifies the fields that matter. */
function makeComment(overrides: Partial<Comment> = {}): Comment {
    return {
        id: 'c1',
        owner: 'testuser',
        ownerDisplayName: 'Test User',
        ownerCohort: '1500-1600',
        ownerPreviousCohort: '1400-1500',
        content: 'Test comment',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}

describe('groupCommentsIntoThreads', () => {
    describe('P0 — Core Behavior', () => {
        it('returns empty array for empty input', () => {
            expect(groupCommentsIntoThreads([])).toEqual([]);
        });

        it('places top-level comments as roots with empty replies', () => {
            const comments = [
                makeComment({ id: 'a', createdAt: '2024-01-01T00:00:00Z' }),
                makeComment({ id: 'b', createdAt: '2024-01-02T00:00:00Z' }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(2);
            expect(threads[0].root.id).toBe('a');
            expect(threads[0].replies).toEqual([]);
            expect(threads[1].root.id).toBe('b');
            expect(threads[1].replies).toEqual([]);
        });

        it('groups a reply under its parent thread', () => {
            const comments = [
                makeComment({ id: 'root', createdAt: '2024-01-01T00:00:00Z' }),
                makeComment({
                    id: 'reply',
                    parentId: 'root',
                    createdAt: '2024-01-02T00:00:00Z',
                }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(1);
            expect(threads[0].root.id).toBe('root');
            expect(threads[0].replies).toHaveLength(1);
            expect(threads[0].replies[0].id).toBe('reply');
        });

        it('groups multiple replies under the same parent', () => {
            const comments = [
                makeComment({ id: 'root', createdAt: '2024-01-01T00:00:00Z' }),
                makeComment({
                    id: 'r1',
                    parentId: 'root',
                    createdAt: '2024-01-02T00:00:00Z',
                }),
                makeComment({
                    id: 'r2',
                    parentId: 'root',
                    createdAt: '2024-01-03T00:00:00Z',
                }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(1);
            expect(threads[0].replies).toHaveLength(2);
            expect(threads[0].replies[0].id).toBe('r1');
            expect(threads[0].replies[1].id).toBe('r2');
        });

        it('groups multiple threads each with their own replies', () => {
            const comments = [
                makeComment({ id: 'rootA', createdAt: '2024-01-01T00:00:00Z' }),
                makeComment({ id: 'rootB', createdAt: '2024-01-02T00:00:00Z' }),
                makeComment({
                    id: 'replyA',
                    parentId: 'rootA',
                    createdAt: '2024-01-03T00:00:00Z',
                }),
                makeComment({
                    id: 'replyB',
                    parentId: 'rootB',
                    createdAt: '2024-01-04T00:00:00Z',
                }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(2);
            expect(threads[0].root.id).toBe('rootA');
            expect(threads[0].replies[0].id).toBe('replyA');
            expect(threads[1].root.id).toBe('rootB');
            expect(threads[1].replies[0].id).toBe('replyB');
        });

        it('sorts top-level threads by createdAt ascending', () => {
            const comments = [
                makeComment({ id: 'late', createdAt: '2024-03-01T00:00:00Z' }),
                makeComment({ id: 'early', createdAt: '2024-01-01T00:00:00Z' }),
                makeComment({ id: 'mid', createdAt: '2024-02-01T00:00:00Z' }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads.map((t) => t.root.id)).toEqual(['early', 'mid', 'late']);
        });

        it('sorts replies within a thread by createdAt ascending', () => {
            const comments = [
                makeComment({ id: 'root', createdAt: '2024-01-01T00:00:00Z' }),
                makeComment({
                    id: 'late-reply',
                    parentId: 'root',
                    createdAt: '2024-01-03T00:00:00Z',
                }),
                makeComment({
                    id: 'early-reply',
                    parentId: 'root',
                    createdAt: '2024-01-02T00:00:00Z',
                }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads[0].replies.map((r) => r.id)).toEqual(['early-reply', 'late-reply']);
        });
    });

    describe('P1 — Edge Cases', () => {
        it('returns one thread for a single top-level comment', () => {
            const comments = [makeComment({ id: 'solo' })];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(1);
            expect(threads[0].root.id).toBe('solo');
            expect(threads[0].replies).toEqual([]);
        });

        it('returns one thread when a single reply has its parent present', () => {
            const comments = [
                makeComment({ id: 'parent', createdAt: '2024-01-01T00:00:00Z' }),
                makeComment({
                    id: 'child',
                    parentId: 'parent',
                    createdAt: '2024-01-02T00:00:00Z',
                }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(1);
            expect(threads[0].root.id).toBe('parent');
            expect(threads[0].replies[0].id).toBe('child');
        });

        it('promotes orphaned reply to top-level when parent is missing', () => {
            const comments = [
                makeComment({
                    id: 'orphan',
                    parentId: 'deleted-parent',
                    createdAt: '2024-01-01T00:00:00Z',
                }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(1);
            expect(threads[0].root.id).toBe('orphan');
            expect(threads[0].replies).toEqual([]);
        });

        it('handles mix of orphaned and valid replies correctly', () => {
            const comments = [
                makeComment({ id: 'root', createdAt: '2024-01-01T00:00:00Z' }),
                makeComment({
                    id: 'valid-reply',
                    parentId: 'root',
                    createdAt: '2024-01-02T00:00:00Z',
                }),
                makeComment({
                    id: 'orphan',
                    parentId: 'gone',
                    createdAt: '2024-01-03T00:00:00Z',
                }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(2);
            // root thread with its reply
            expect(threads[0].root.id).toBe('root');
            expect(threads[0].replies[0].id).toBe('valid-reply');
            // orphan promoted to top-level
            expect(threads[1].root.id).toBe('orphan');
            expect(threads[1].replies).toEqual([]);
        });

        it('preserves insertion order for comments with identical createdAt', () => {
            const sameTime = '2024-01-01T00:00:00Z';
            const comments = [
                makeComment({ id: 'a', createdAt: sameTime }),
                makeComment({ id: 'b', createdAt: sameTime }),
                makeComment({ id: 'c', createdAt: sameTime }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(3);
            // All three should appear as roots in some stable order
            expect(threads.map((t) => t.root.id)).toEqual(['a', 'b', 'c']);
        });

        it('groups reply correctly when it appears before its root in the input', () => {
            const comments = [
                makeComment({
                    id: 'reply',
                    parentId: 'root',
                    createdAt: '2024-01-02T00:00:00Z',
                }),
                makeComment({ id: 'root', createdAt: '2024-01-01T00:00:00Z' }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(1);
            expect(threads[0].root.id).toBe('root');
            expect(threads[0].replies[0].id).toBe('reply');
        });

        it('does not mutate the input array', () => {
            const comments = [
                makeComment({ id: 'b', createdAt: '2024-02-01T00:00:00Z' }),
                makeComment({ id: 'a', createdAt: '2024-01-01T00:00:00Z' }),
            ];
            const original = [...comments];
            groupCommentsIntoThreads(comments);
            expect(comments).toEqual(original);
        });

        it('drops comment whose parentId references itself (not treated as root)', () => {
            // A comment whose parentId is its own id gets classified as a reply
            // (commentIds.has(parentId) is true), but since it's not also a root,
            // no thread ever picks it up from repliesByParent.
            const comments = [
                makeComment({ id: 'self', parentId: 'self', createdAt: '2024-01-01T00:00:00Z' }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads).toHaveLength(0);
        });

        it('sorts correctly when input arrives in reverse chronological order', () => {
            const comments = [
                makeComment({ id: 'c', createdAt: '2024-03-01T00:00:00Z' }),
                makeComment({ id: 'b', createdAt: '2024-02-01T00:00:00Z' }),
                makeComment({ id: 'a', createdAt: '2024-01-01T00:00:00Z' }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            expect(threads.map((t) => t.root.id)).toEqual(['a', 'b', 'c']);
        });
    });

    describe('P2 — Stress and unusual cases', () => {
        it('handles 100 comments without crashing', () => {
            const comments: Comment[] = [];
            for (let i = 0; i < 100; i++) {
                comments.push(
                    makeComment({
                        id: `c${i}`,
                        createdAt: new Date(2024, 0, 1, 0, 0, i).toISOString(),
                        ...(i > 0 && i % 5 === 0 ? { parentId: `c${i - 1}` } : {}),
                    }),
                );
            }
            const threads = groupCommentsIntoThreads(comments);
            // 100 comments, 19 are replies (i=5,10,...,95), so 81 root threads
            expect(threads).toHaveLength(81);
            // All comments should be accounted for
            const totalComments = threads.reduce((sum, t) => sum + 1 + t.replies.length, 0);
            expect(totalComments).toBe(100);
        });

        it('drops nested reply whose parentId points to a non-root comment', () => {
            // Backend resolves reply-to-reply parentIds to the root, but test
            // the case where a comment points to another reply (not a root).
            // reply2's parentId is 'reply1' which exists in commentIds but is
            // not a root, so reply2 ends up in repliesByParent['reply1'] which
            // is never attached to a thread — the comment is silently lost.
            const comments = [
                makeComment({ id: 'root', createdAt: '2024-01-01T00:00:00Z' }),
                makeComment({
                    id: 'reply1',
                    parentId: 'root',
                    createdAt: '2024-01-02T00:00:00Z',
                }),
                makeComment({
                    id: 'reply2',
                    parentId: 'reply1',
                    createdAt: '2024-01-03T00:00:00Z',
                }),
            ];
            const threads = groupCommentsIntoThreads(comments);
            // reply1 is grouped under root
            expect(threads[0].root.id).toBe('root');
            expect(threads[0].replies[0].id).toBe('reply1');
            // reply2 is lost — never attached to any thread
            const allReplies = threads.flatMap((t) => t.replies);
            expect(allReplies.find((r) => r.id === 'reply2')).toBeUndefined();
        });
    });
});
