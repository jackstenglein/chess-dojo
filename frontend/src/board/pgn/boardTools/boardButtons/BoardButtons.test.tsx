import { ChessContext } from '@/board/pgn/PgnBoard';
import { renderWithIntl } from '@/i18n/intl.test';
import { Chess } from '@jackstenglein/chess';
import { cleanup, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BoardButtons from './BoardButtons';

vi.mock('@/board/Board', () => ({ useReconcile: () => () => undefined }));

/** The row's buttons by name, with the given slot element. */
function rowButtons(boardButtons?: JSX.Element) {
    const view = renderWithIntl(
        <ChessContext.Provider value={{ chess: new Chess(), slots: { boardButtons } }}>
            <BoardButtons />
        </ChessContext.Provider>,
    );
    const names = screen
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent);
    view.unmount();
    return names;
}

describe('BoardButtons', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the slot element after its own controls and nothing else', () => {
        const plain = rowButtons();
        const withSlot = rowButtons(<button>Slot</button>);
        expect(plain).toEqual(['Copy', 'first move', 'previous move', 'next move', 'last move']);
        expect(withSlot).toEqual([...plain, 'Slot']);
    });
});
