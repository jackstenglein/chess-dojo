import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DrillRatingsCard } from './DrillRatingsCard';

describe('DrillRatingsCard', () => {
    it('renders the mate-in-one personal best rating', () => {
        render(<DrillRatingsCard mateInOneRating={1850} />);

        expect(screen.getByText('Drill Ratings')).toBeInTheDocument();
        expect(screen.getByText('Mate-in-One PR')).toBeInTheDocument();
        expect(screen.getByText('1850')).toBeInTheDocument();
    });

    it('renders nothing when the mate-in-one rating is missing', () => {
        const { container } = render(<DrillRatingsCard />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the mate-in-one rating is zero', () => {
        const { container } = render(<DrillRatingsCard mateInOneRating={0} />);

        expect(container).toBeEmptyDOMElement();
    });
});
