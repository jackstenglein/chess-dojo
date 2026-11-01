import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PgnErrorBoundary from './PgnErrorBoundary';

vi.mock('@/analytics/events', () => ({
    EventType: { PgnErrorBoundary: 'pgn_error_boundary' },
    trackEvent: vi.fn(),
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: undefined }),
}));

vi.mock('@/logging/logger', () => ({
    logger: { error: vi.fn() },
}));

vi.mock('next-intl', () => ({
    useTranslations: () => {
        const messages: Record<string, string> = {
            copyPgn: 'Copy PGN',
            invalidPgn: 'Invalid PGN',
            invalidPgnDescription: 'The PGN could not be displayed.',
            noComponentStack: 'No component stack',
            nullError: 'Null error',
            rawPgnLabel: 'Raw PGN:',
        };
        return (key: string) => messages[key] ?? key;
    },
}));

vi.mock('./DeleteGameButton', () => ({
    default: () => null,
}));

function BrokenBoard(): ReactNode {
    throw new Error('Board crashed');
}

describe('PgnErrorBoundary', () => {
    const writeText = vi.fn();

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        writeText.mockReset();
        writeText.mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('displays and copies the current PGN after the board crashes', () => {
        const currentPgn = '[Event "Analysis"]\n\n1. e4 e5 2. Nf3';

        render(
            <PgnErrorBoundary pgn='[Event "Starting"]\n\n1. e4' getCurrentPgn={() => currentPgn}>
                <BrokenBoard />
            </PgnErrorBoundary>,
        );

        expect(screen.getByText(/^Raw PGN:/).textContent).toContain(currentPgn);

        fireEvent.click(screen.getByRole('button', { name: 'Copy PGN' }));
        expect(writeText).toHaveBeenCalledWith(currentPgn);
    });

    it('falls back to the starting PGN when the current PGN cannot be rendered', () => {
        const startingPgn = '[Event "Starting"]\n\n1. d4';

        render(
            <PgnErrorBoundary
                pgn={startingPgn}
                getCurrentPgn={() => {
                    throw new Error('PGN rendering failed');
                }}
            >
                <BrokenBoard />
            </PgnErrorBoundary>,
        );

        expect(screen.getByText(/^Raw PGN:/).textContent).toContain(startingPgn);

        fireEvent.click(screen.getByRole('button', { name: 'Copy PGN' }));
        expect(writeText).toHaveBeenCalledWith(startingPgn);
    });

    it('preserves an empty current PGN instead of falling back to the starting PGN', () => {
        const startingPgn = '[Event "Starting"]\n\n1. d4';

        render(
            <PgnErrorBoundary pgn={startingPgn} getCurrentPgn={() => ''}>
                <BrokenBoard />
            </PgnErrorBoundary>,
        );

        expect(screen.getByText(/^Raw PGN:/).textContent).not.toContain(startingPgn);

        fireEvent.click(screen.getByRole('button', { name: 'Copy PGN' }));
        expect(writeText).toHaveBeenCalledWith('');
    });
});
