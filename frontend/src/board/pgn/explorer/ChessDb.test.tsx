import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '~/messages/en.json';
import { ChessDBTab } from './ChessDb';

vi.mock('@mui/icons-material', () => ({ Help: () => <span /> }));
vi.mock('../../Board', () => ({ useReconcile: () => vi.fn() }));
vi.mock('../PgnBoard', () => ({ useChess: () => ({ chess: undefined }) }));

const baseProps = {
    moves: [],
    loading: false,
    error: 'Position evaluation not available: unknown',
    requestAnalysis: vi.fn(),
};

function renderTab(props: ComponentProps<typeof ChessDBTab>) {
    return render(
        <NextIntlClientProvider
            locale='en'
            messages={{ analysisBoard: { explorer: messages.analysisBoard.explorer } }}
        >
            <ChessDBTab {...props} />
        </NextIntlClientProvider>,
    );
}

describe('ChessDBTab queue feedback', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('disables the queue button while the request is in flight', () => {
        renderTab({ ...baseProps, queueing: true, queued: false });

        expect(screen.getByRole('button', { name: 'Queue Analysis' })).toBeDisabled();
    });

    it('shows a confirmation instead of another button after queueing', () => {
        renderTab({ ...baseProps, error: null, queueing: false, queued: true });

        expect(screen.getByText('Analysis queued. Check back later.')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Queue Analysis' })).not.toBeInTheDocument();
    });
});
