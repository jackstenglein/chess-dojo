import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { PlayerNameWithTitle } from './PlayerNameWithTitle';

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

describe('PlayerNameWithTitle', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders name without title when no title provided', () => {
        renderWithIntl(<PlayerNameWithTitle name='Magnus Carlsen' />);
        expect(screen.getByText('Magnus Carlsen')).toBeInTheDocument();
        expect(screen.queryByText('GM')).not.toBeInTheDocument();
    });

    it('renders name with title when title provided', () => {
        renderWithIntl(<PlayerNameWithTitle name='Garry Kasparov' title='GM' />);
        expect(screen.getByText('Garry Kasparov')).toBeInTheDocument();
        expect(screen.getByText('GM')).toBeInTheDocument();
        expect(screen.getByLabelText('Grandmaster')).toBeInTheDocument();
    });

    it('renders title before name by default', () => {
        renderWithIntl(<PlayerNameWithTitle name='Bobby Fischer' title='IM' />);
        const container = screen.getByText('Bobby Fischer').parentElement;
        const titleElement = screen.getByLabelText('International Master');
        const nameElement = screen.getByText('Bobby Fischer');

        expect(container?.children[0]).toBe(titleElement);
        expect(container?.children[1]).toBe(nameElement);
    });

    it('renders title after name when titleBeforeName is false', () => {
        renderWithIntl(
            <PlayerNameWithTitle name='Anatoly Karpov' title='FM' titleBeforeName={false} />,
        );
        const container = screen.getByText('Anatoly Karpov').parentElement;
        const titleElement = screen.getByLabelText('FIDE Master');
        const nameElement = screen.getByText('Anatoly Karpov');

        expect(container?.children[0]).toBe(nameElement);
        expect(container?.children[1]).toBe(titleElement);
    });

    it('applies custom typography variant', () => {
        renderWithIntl(<PlayerNameWithTitle name='Vishy Anand' title='GM' variant='h6' />);
        const nameElement = screen.getByText('Vishy Anand');
        expect(nameElement).toHaveClass('MuiTypography-h6');
    });

    it('handles empty name gracefully', () => {
        const { container } = renderWithIntl(<PlayerNameWithTitle name='' title='CM' />);
        expect(screen.getByText('CM')).toBeInTheDocument();
        // Just verify the component renders without crashing
        expect(container.firstChild).toBeInTheDocument();
    });

    it('handles special characters in name', () => {
        renderWithIntl(<PlayerNameWithTitle name='José R. Capablanca' title='WGM' />);
        expect(screen.getByText('José R. Capablanca')).toBeInTheDocument();
        expect(screen.getByText('WGM')).toBeInTheDocument();
    });
});
