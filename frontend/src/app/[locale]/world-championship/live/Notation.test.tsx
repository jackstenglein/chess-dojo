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
});
