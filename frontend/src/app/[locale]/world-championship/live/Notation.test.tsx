import { Chess } from '@jackstenglein/chess';
import {
    AnalysisNode,
    buildTree,
    findNode,
} from '@jackstenglein/chess-dojo-common/src/wcLive/analysis';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveMove } from './lichessFeed';
import { Notation } from './Notation';

function mainline(sans: string[]): LiveMove[] {
    const chess = new Chess();
    return sans.map((s, i) => {
        const m = chess.move(s);
        if (!m) {
            throw new Error(s);
        }
        return {
            ply: i + 1,
            san: m.san,
            uci: m.uci,
            from: m.from,
            to: m.to,
            fen: m.fen,
            spent: 30,
        };
    });
}

describe('Notation', () => {
    afterEach(cleanup);

    const moves = mainline(['e4', 'e5', 'Nf3', 'Nc6']);
    const tree = buildTree(moves, [
        ['d4', 'd5'],
        ['d4', 'Nf6'],
        ['e4', 'c5', 'Nf3', 'd6'],
        ['e4', 'c5', 'Nf3', 'Nc6'],
        ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    ]);

    it('writes variations ChessBase style, under the move they branch from', () => {
        const current = findNode(tree, ['e4', 'e5', 'Nf3', 'Nc6']) ?? tree;
        render(
            <Notation
                root={tree}
                current={current}
                moves={moves}
                guesses={{}}
                onSelect={() => undefined}
            />,
        );
        const blocks = screen
            .getAllByTestId('variation-block')
            .map((b) => b.textContent?.replace(/\s+/g, ' ').trim());
        expect(blocks).toEqual([
            // Instead of 1.e4, with Black's alternatives to 1...d5 in brackets.
            '1.d4 d5 (1...Nf6)',
            // Instead of 1...e5.
            '1...c5 2.Nf3 d6 (2...Nc6)',
            // From the live position: what the senseis expect next.
            '3.Bb5',
        ]);
        expect(screen.getAllByTestId('move-time')[0].textContent).toBe('0:30');
    });

    it('opens a variation move when it is clicked', () => {
        const onSelect = vi.fn<(node: AnalysisNode) => void>();
        render(
            <Notation root={tree} current={tree} moves={moves} guesses={{}} onSelect={onSelect} />,
        );
        fireEvent.click(screen.getByText('2...Nc6'));
        expect(onSelect.mock.calls[0][0].path).toEqual(['e4', 'c5', 'Nf3', 'Nc6']);
    });

    it('shows only the game when there is no analysis, as fans see it', () => {
        const fanTree = buildTree(moves, []);
        render(
            <Notation
                root={fanTree}
                current={fanTree}
                moves={moves}
                guesses={{}}
                onSelect={() => undefined}
            />,
        );
        expect(screen.queryAllByTestId('variation-block')).toHaveLength(0);
        expect(screen.getByText('Nc6')).toBeTruthy();
    });

    describe('the button back to the latest move', () => {
        const fanTree = buildTree(moves, []);
        const earlier = findNode(fanTree, ['e4', 'e5']) ?? fanTree;

        it('goes back to the live move while the game is being played', () => {
            const onLive = vi.fn();
            render(
                <Notation
                    root={fanTree}
                    current={earlier}
                    moves={moves}
                    guesses={{}}
                    onSelect={() => undefined}
                    onLive={onLive}
                />,
            );
            fireEvent.click(screen.getByRole('button', { name: 'Back to live move' }));
            expect(onLive).toHaveBeenCalledOnce();
        });

        it('goes back to the last move of a finished game and does not call it live', () => {
            const onLive = vi.fn();
            render(
                <Notation
                    root={fanTree}
                    current={earlier}
                    moves={moves}
                    guesses={{}}
                    onSelect={() => undefined}
                    onLive={onLive}
                    gameOver
                />,
            );
            fireEvent.click(screen.getByRole('button', { name: 'Back to last move' }));
            expect(onLive).toHaveBeenCalledOnce();
            expect(screen.queryByText(/live/i)).toBeNull();
        });
    });

    describe('keeping the move on the board in view', () => {
        afterEach(() => vi.restoreAllMocks());

        const fanTree = buildTree(moves, []);
        const at = (path: string[]) => findNode(fanTree, path) ?? fanTree;
        const notation = (current: AnalysisNode) => (
            <Notation
                root={fanTree}
                current={current}
                moves={moves}
                guesses={{}}
                onSelect={() => undefined}
            />
        );

        /**
         * Tests have no layout, so this gives the list and the current move their
         * boxes by hand. The list shows 100 to 200, and nothing else has a size.
         */
        function place(move: { top: number; bottom: number }) {
            vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
                this: HTMLElement,
            ) {
                if (this.dataset.current === 'true') {
                    return move as DOMRect;
                }
                const isList = !!this.querySelector(':scope > [data-current="true"]');
                return (isList ? { top: 100, bottom: 200 } : { top: 0, bottom: 0 }) as DOMRect;
            });
        }

        function list() {
            const el = screen.getByText('Nc6').closest('button')?.parentElement;
            if (!el) {
                throw new Error('no move list');
            }
            return el;
        }

        it('scrolls the list down to a new move below it, and never the page', () => {
            const pageScroll = vi.spyOn(Element.prototype, 'scrollIntoView');
            place({ top: 150, bottom: 170 });
            const { rerender } = render(notation(at(['e4', 'e5', 'Nf3'])));
            expect(list().scrollTop).toBe(0);

            // The next move of the game is 40px below the bottom of the list.
            place({ top: 220, bottom: 240 });
            rerender(notation(at(['e4', 'e5', 'Nf3', 'Nc6'])));
            expect(list().scrollTop).toBe(40);
            // scrollIntoView also scrolls the page, which on a phone takes the board off screen.
            expect(pageScroll).not.toHaveBeenCalled();
        });

        it('scrolls the list up to a move above it', () => {
            place({ top: 150, bottom: 170 });
            const { rerender } = render(notation(at(['e4', 'e5', 'Nf3', 'Nc6'])));
            list().scrollTop = 80;

            // Stepping back shows a move that is 30px above the top of the list.
            place({ top: 70, bottom: 90 });
            rerender(notation(at(['e4', 'e5'])));
            expect(list().scrollTop).toBe(50);
        });

        it('leaves the list alone when the move is already showing', () => {
            place({ top: 150, bottom: 170 });
            const { rerender } = render(notation(at(['e4', 'e5', 'Nf3'])));
            list().scrollTop = 25;
            rerender(notation(at(['e4', 'e5', 'Nf3', 'Nc6'])));
            expect(list().scrollTop).toBe(25);
        });
    });
});
