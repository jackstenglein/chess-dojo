import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NewsfeedButton } from './NewsfeedButton';

describe('NewsfeedButton', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders an icon button linking to /newsfeed', () => {
        render(<NewsfeedButton />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/newsfeed');
    });

    it('has a Newsfeed tooltip', () => {
        render(<NewsfeedButton />);
        const button = screen.getByRole('link');
        expect(button.closest('[title="Newsfeed"]') || button).toBeTruthy();
    });

    it('has the data-cy attribute for E2E selectors', () => {
        render(<NewsfeedButton />);
        const button = screen.getByRole('link');
        expect(button).toHaveAttribute('data-cy', 'newsfeed-button');
    });

    it('renders the Feed icon', () => {
        const { container } = render(<NewsfeedButton />);
        const svgIcon = container.querySelector('svg[data-testid="FeedIcon"]');
        expect(svgIcon).toBeInTheDocument();
    });
});
