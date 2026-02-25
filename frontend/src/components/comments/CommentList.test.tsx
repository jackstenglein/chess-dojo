import type { Comment } from '@jackstenglein/chess-dojo-common/src/database/timeline';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CommentList from './CommentList';

// --- Mocks ---

const mockUser = {
    username: 'viewer',
    isAdmin: false,
    timezoneOverride: undefined,
    timeFormat: undefined,
};

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/profile/Avatar', () => ({
    default: ({ displayName }: { displayName?: string }) => (
        <div data-testid='avatar'>{displayName}</div>
    ),
}));

vi.mock('@/components/navigation/Link', async () => {
    const { forwardRef } = await import('react');
    return {
        Link: forwardRef<HTMLAnchorElement, { children: React.ReactNode; href: string }>(
            ({ children, href, ...rest }, ref) => (
                <a ref={ref} href={href} {...rest}>
                    {children}
                </a>
            ),
        ),
    };
});

// --- Helpers ---

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

function makeThread(rootId: string, replyCount: number): Comment[] {
    const root = makeComment({
        id: rootId,
        content: `Root ${rootId}`,
        ownerDisplayName: `User ${rootId}`,
        createdAt: '2024-01-01T00:00:00Z',
    });
    const replies = Array.from({ length: replyCount }, (_, i) =>
        makeComment({
            id: `${rootId}-r${i + 1}`,
            parentId: rootId,
            content: `Reply ${i + 1}`,
            ownerDisplayName: `Replier ${i + 1}`,
            createdAt: new Date(2024, 0, 2 + i).toISOString(),
        }),
    );
    return [root, ...replies];
}

// --- Tests ---

describe('CommentList', () => {
    afterEach(cleanup);

    describe('Collapsible reply threads', () => {
        it('shows all replies when thread has fewer than 3', () => {
            const comments = makeThread('root', 2);
            render(<CommentList comments={comments} threaded />);

            expect(screen.getByText('Reply 1')).toBeInTheDocument();
            expect(screen.getByText('Reply 2')).toBeInTheDocument();
            expect(screen.queryByText(/Show .* more/)).not.toBeInTheDocument();
            expect(screen.queryByText('Hide replies')).not.toBeInTheDocument();
        });

        it('collapses thread with 3 replies, showing only last 2', () => {
            const comments = makeThread('root', 3);
            render(<CommentList comments={comments} threaded />);

            expect(screen.queryByText('Reply 1')).not.toBeInTheDocument();
            expect(screen.getByText('Reply 2')).toBeInTheDocument();
            expect(screen.getByText('Reply 3')).toBeInTheDocument();
            expect(screen.getByText('Show 1 more reply')).toBeInTheDocument();
        });

        it('uses plural "replies" when more than 1 reply is hidden', () => {
            const comments = makeThread('root', 5);
            render(<CommentList comments={comments} threaded />);

            expect(screen.getByText('Show 3 more replies')).toBeInTheDocument();
            expect(screen.getByText('Reply 4')).toBeInTheDocument();
            expect(screen.getByText('Reply 5')).toBeInTheDocument();
            expect(screen.queryByText('Reply 1')).not.toBeInTheDocument();
            expect(screen.queryByText('Reply 2')).not.toBeInTheDocument();
            expect(screen.queryByText('Reply 3')).not.toBeInTheDocument();
        });

        it('expands all replies on click and shows Hide replies', () => {
            const comments = makeThread('root', 4);
            render(<CommentList comments={comments} threaded />);

            expect(screen.queryByText('Reply 1')).not.toBeInTheDocument();
            expect(screen.queryByText('Reply 2')).not.toBeInTheDocument();

            fireEvent.click(screen.getByText('Show 2 more replies'));

            expect(screen.getByText('Reply 1')).toBeInTheDocument();
            expect(screen.getByText('Reply 2')).toBeInTheDocument();
            expect(screen.getByText('Reply 3')).toBeInTheDocument();
            expect(screen.getByText('Reply 4')).toBeInTheDocument();
            expect(screen.getByText('Hide replies')).toBeInTheDocument();
        });

        it('re-collapses to last 2 when clicking Hide replies', () => {
            const comments = makeThread('root', 4);
            render(<CommentList comments={comments} threaded />);

            fireEvent.click(screen.getByText('Show 2 more replies'));
            fireEvent.click(screen.getByText('Hide replies'));

            expect(screen.queryByText('Reply 1')).not.toBeInTheDocument();
            expect(screen.queryByText('Reply 2')).not.toBeInTheDocument();
            expect(screen.getByText('Reply 3')).toBeInTheDocument();
            expect(screen.getByText('Reply 4')).toBeInTheDocument();
            expect(screen.getByText('Show 2 more replies')).toBeInTheDocument();
        });

        it('does not show collapse controls for thread with 0 replies', () => {
            const comments = makeThread('root', 0);
            render(<CommentList comments={comments} threaded />);

            expect(screen.getByText('Root root')).toBeInTheDocument();
            expect(screen.queryByText(/Show .* more/)).not.toBeInTheDocument();
            expect(screen.queryByText('Hide replies')).not.toBeInTheDocument();
        });
    });

    describe('Inline reply editor placement', () => {
        it('shows reply editor below root when clicking reply on root', () => {
            const onSubmitReply = vi.fn().mockResolvedValue(undefined);
            const comments = makeThread('root', 1);
            render(<CommentList comments={comments} threaded onSubmitReply={onSubmitReply} />);

            const replyButtons = screen.getAllByLabelText('Reply');
            fireEvent.click(replyButtons[0]);

            expect(screen.getByText('Replying to User root')).toBeInTheDocument();
            expect(screen.getByLabelText('Write a reply...')).toBeInTheDocument();
        });

        it('shows reply editor below a reply when clicking reply on it', () => {
            const onSubmitReply = vi.fn().mockResolvedValue(undefined);
            const comments = makeThread('root', 2);
            render(<CommentList comments={comments} threaded onSubmitReply={onSubmitReply} />);

            const replyButtons = screen.getAllByLabelText('Reply');
            // index: 0=root, 1=reply1, 2=reply2
            fireEvent.click(replyButtons[2]);

            expect(screen.getByText('Replying to Replier 2')).toBeInTheDocument();
        });

        it('moves editor when clicking reply on a different comment', () => {
            const onSubmitReply = vi.fn().mockResolvedValue(undefined);
            const comments = makeThread('root', 2);
            render(<CommentList comments={comments} threaded onSubmitReply={onSubmitReply} />);

            const replyButtons = screen.getAllByLabelText('Reply');
            fireEvent.click(replyButtons[0]);
            expect(screen.getByText('Replying to User root')).toBeInTheDocument();

            fireEvent.click(replyButtons[1]);
            expect(screen.queryByText('Replying to User root')).not.toBeInTheDocument();
            expect(screen.getByText('Replying to Replier 1')).toBeInTheDocument();
        });

        it('hides editor when clicking cancel', () => {
            const onSubmitReply = vi.fn().mockResolvedValue(undefined);
            const comments = makeThread('root', 0);
            render(<CommentList comments={comments} threaded onSubmitReply={onSubmitReply} />);

            fireEvent.click(screen.getByLabelText('Reply'));
            expect(screen.getByText('Replying to User root')).toBeInTheDocument();

            const replyEditor = screen.getByText('Replying to User root')
                .parentElement as HTMLElement;
            const cancelButton = within(replyEditor).getByRole('button');
            fireEvent.click(cancelButton);

            expect(screen.queryByText('Replying to User root')).not.toBeInTheDocument();
        });
    });

    describe('Reply-to-reply routes parentId to thread root', () => {
        it('shows root display name when replying to root', () => {
            const onSubmitReply = vi.fn().mockResolvedValue(undefined);
            const comments = makeThread('root', 1);
            render(<CommentList comments={comments} threaded onSubmitReply={onSubmitReply} />);

            const replyButtons = screen.getAllByLabelText('Reply');
            fireEvent.click(replyButtons[0]);

            expect(screen.getByText('Replying to User root')).toBeInTheDocument();
        });

        it('shows reply display name when replying to a reply', () => {
            const onSubmitReply = vi.fn().mockResolvedValue(undefined);
            const comments = makeThread('root', 1);
            render(<CommentList comments={comments} threaded onSubmitReply={onSubmitReply} />);

            const replyButtons = screen.getAllByLabelText('Reply');
            fireEvent.click(replyButtons[1]);

            // Shows reply's name, not root's name
            expect(screen.getByText('Replying to Replier 1')).toBeInTheDocument();
            expect(screen.queryByText('Replying to User root')).not.toBeInTheDocument();
        });

        it('does not show reply editor when onSubmitReply is not provided', () => {
            const comments = makeThread('root', 1);
            render(<CommentList comments={comments} threaded />);

            // Reply buttons should not exist without onSubmitReply or onReply
            expect(screen.queryByLabelText('Reply')).not.toBeInTheDocument();
        });
    });

    describe('Auto-expand on reply submit', () => {
        it('reply editor appears for collapsed thread without expanding', () => {
            const onSubmitReply = vi.fn().mockResolvedValue(undefined);
            const comments = makeThread('root', 3);
            render(<CommentList comments={comments} threaded onSubmitReply={onSubmitReply} />);

            // Thread is collapsed — Reply 1 hidden, Reply 2 and 3 visible
            expect(screen.queryByText('Reply 1')).not.toBeInTheDocument();
            expect(screen.getByText('Reply 2')).toBeInTheDocument();
            expect(screen.getByText('Reply 3')).toBeInTheDocument();

            // Click reply on root — editor appears but thread stays collapsed
            const replyButtons = screen.getAllByLabelText('Reply');
            fireEvent.click(replyButtons[0]);

            expect(screen.getByText('Replying to User root')).toBeInTheDocument();
            // Reply 1 still hidden since we haven't submitted yet
            expect(screen.queryByText('Reply 1')).not.toBeInTheDocument();
            expect(screen.getByText('Show 1 more reply')).toBeInTheDocument();
        });
    });
});
