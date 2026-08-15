import { GameData } from '@/database/explorer';
import { GameResult } from '@/database/game';
import { Chess, FEN } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import { OpeningTree } from './OpeningTree';
import { Color, GameFilters, MAX_DOWNLOAD_LIMIT, MAX_PLY_COUNT, SourceType } from './PlayerSource';
import { createRepertoireSpyMoveProvider } from './repertoireSpyMoveProvider';

const filters: GameFilters = {
    color: Color.Both,
    win: true,
    draw: true,
    loss: true,
    rated: true,
    casual: true,
    bullet: true,
    blitz: true,
    rapid: true,
    classical: true,
    daily: true,
    opponentRating: [0, 4000],
    downloadLimit: MAX_DOWNLOAD_LIMIT,
    dateRange: ['', ''],
    plyCount: [0, MAX_PLY_COUNT],
    hiddenSources: [],
};

function game(url: string, playerColor = Color.White): GameData {
    const targetIsWhite = playerColor === Color.White;

    return {
        source: { type: SourceType.Chesscom, username: 'target' },
        playerColor,
        white: targetIsWhite ? 'target' : 'opponent',
        black: targetIsWhite ? 'opponent' : 'target',
        whiteElo: 1500,
        normalizedWhiteElo: 1500,
        blackElo: 1500,
        normalizedBlackElo: 1500,
        result: targetIsWhite ? GameResult.White : GameResult.Black,
        plyCount: 20,
        rated: true,
        url,
        headers: { Date: '2026.01.01', Site: url },
        timeClass: 'blitz',
    } as GameData;
}

function treeWithStartingMoves(): OpeningTree {
    const tree = new OpeningTree();
    tree.setGame(game('g1'));
    tree.setGame(game('g2'));
    tree.setGame(game('g3'));
    tree.setPosition(FEN.start, {
        white: 3,
        black: 0,
        draws: 0,
        games: new Set(['g1', 'g2', 'g3']),
        moves: [
            { san: 'e4', white: 2, black: 0, draws: 0, games: new Set(['g1', 'g2']) },
            { san: 'd4', white: 1, black: 0, draws: 0, games: new Set(['g3']) },
        ],
    });
    return tree;
}

function treeWithTargetAndOpponentBlackMoves(fen: string): OpeningTree {
    const tree = new OpeningTree();
    tree.setGame(game('target-as-white', Color.White));
    tree.setGame(game('target-as-black', Color.Black));
    tree.setPosition(fen, {
        white: 1,
        black: 1,
        draws: 0,
        games: new Set(['target-as-white', 'target-as-black']),
        moves: [
            { san: 'e5', white: 1, black: 0, draws: 0, games: new Set(['target-as-white']) },
            { san: 'c5', white: 0, black: 1, draws: 0, games: new Set(['target-as-black']) },
        ],
    });
    return tree;
}

describe('createRepertoireSpyMoveProvider', () => {
    it('returns null when the filtered position is below the minimum game threshold', async () => {
        const provider = createRepertoireSpyMoveProvider({
            openingTree: treeWithStartingMoves(),
            filters,
            minGames: 4,
            random: () => 0,
        });

        expect(
            await provider({
                fen: FEN.start,
                maiaRating: 1500,
                plyCount: 0,
            }),
        ).toBeNull();
    });

    it('returns a deterministic weighted legal UCI move from the player tree', async () => {
        const provider = createRepertoireSpyMoveProvider({
            openingTree: treeWithStartingMoves(),
            filters,
            minGames: 3,
            random: () => 0,
        });

        expect(
            await provider({
                fen: FEN.start,
                maiaRating: 1500,
                plyCount: 0,
            }),
        ).toEqual({
            uci: 'e2e4',
            san: 'e4',
            source: 'repertoire-spy',
        });
    });

    it('uses only the chosen database color when the source filters include both colors', async () => {
        const chess = new Chess();
        chess.move('e4');
        const fen = chess.fen();
        const provider = createRepertoireSpyMoveProvider({
            openingTree: treeWithTargetAndOpponentBlackMoves(fen),
            filters,
            databaseColor: Color.Black,
            minGames: 1,
            random: () => 0,
        });

        expect(
            await provider({
                fen,
                maiaRating: 1500,
                plyCount: 1,
            }),
        ).toEqual({
            uci: 'c7c5',
            san: 'c5',
            source: 'repertoire-spy',
        });
    });
});
