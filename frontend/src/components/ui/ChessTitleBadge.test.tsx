import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChessTitleBadge } from './ChessTitleBadge';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const messages = require('../../../messages/en.json') as Record<string, unknown>;

function renderWithIntl(ui: React.ReactElement) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextIntlClientProvider } = require('next-intl') as {
        NextIntlClientProvider: React.FC<{
            locale: string;
            messages: Record<string, unknown>;
            children: React.ReactNode;
        }>;
    };
    return render(
        <NextIntlClientProvider locale='en' messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

describe('ChessTitleBadge', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders GM title correctly', () => {
        renderWithIntl(<ChessTitleBadge title='GM' />);
        expect(screen.getByText('GM')).toBeInTheDocument();
        expect(screen.getByLabelText('Grandmaster')).toBeInTheDocument();
    });

    it('renders IM title correctly', () => {
        renderWithIntl(<ChessTitleBadge title='IM' />);
        expect(screen.getByText('IM')).toBeInTheDocument();
        expect(screen.getByLabelText('International Master')).toBeInTheDocument();
    });

    it('renders FM title correctly', () => {
        renderWithIntl(<ChessTitleBadge title='FM' />);
        expect(screen.getByText('FM')).toBeInTheDocument();
        expect(screen.getByLabelText('FIDE Master')).toBeInTheDocument();
    });

    it('renders WGM title correctly', () => {
        renderWithIntl(<ChessTitleBadge title='WGM' />);
        expect(screen.getByText('WGM')).toBeInTheDocument();
        expect(screen.getByLabelText('Woman Grandmaster')).toBeInTheDocument();
    });

    it('does not render for unknown title', () => {
        const { container } = renderWithIntl(<ChessTitleBadge title='UNKNOWN' />);
        expect(container.firstChild).toBeNull();
    });

    it('does not render for empty title', () => {
        const { container } = renderWithIntl(<ChessTitleBadge title='' />);
        expect(container.firstChild).toBeNull();
    });

    it('applies custom styling', () => {
        const customSx = { backgroundColor: 'red' };
        renderWithIntl(<ChessTitleBadge title='CM' sx={customSx} />);
        const chip = screen.getByText('CM');
        expect(chip).toBeInTheDocument();
    });

    it('renders with medium size', () => {
        renderWithIntl(<ChessTitleBadge title='NM' size='medium' />);
        const chip = screen.getByText('NM');
        expect(chip).toBeInTheDocument();
    });
});
