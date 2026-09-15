import { PositionComment } from '@/database/game';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InlinePositionComments from './InlinePositionComments';

vi.mock('@/profile/Avatar', () => ({
    default: ({ displayName }: { displayName?: string }) => (
        <span data-testid='inline-comment-avatar'>{displayName}</span>
    ),
}));

afterEach(() => {
    cleanup();
});

function makeComment(overrides: Partial<PositionComment> = {}): PositionComment {
    return {
        id: 'comment-id',
        fen: 'fen',
        ply: 1,
        san: 'e4',
        owner: {
            username: 'commenter',
            displayName: 'Commenter',
            cohort: '1500-1600',
            previousCohort: '1400-1500',
        },
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
        content: 'Interesting move',
        parentIds: '',
        replies: {},
        ...overrides,
    };
}

describe('InlinePositionComments', () => {
    it('renders the commenter avatar and comment text', () => {
        render(<InlinePositionComments comments={[makeComment()]} />);

        expect(screen.getByTestId('inline-comment-avatar')).toHaveTextContent('Commenter');
        expect(screen.getByText('Interesting move')).toBeInTheDocument();
    });

    it('preserves multi-line comment text', () => {
        render(
            <InlinePositionComments comments={[makeComment({ content: 'Line one\nLine two' })]} />,
        );

        expect(
            screen.getByText('Line one\nLine two', { normalizer: (text) => text }),
        ).toBeInTheDocument();
    });

    it('renders nothing for empty comments', () => {
        const { container } = render(<InlinePositionComments comments={[]} />);

        expect(container).toBeEmptyDOMElement();
    });
});
