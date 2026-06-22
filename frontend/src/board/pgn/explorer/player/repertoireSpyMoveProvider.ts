import { BotMoveProvider, BotMoveResult } from '@/components/playbot/botMoveProvider';
import { Chess } from '@jackstenglein/chess';
import { OpeningTree } from './OpeningTree';
import { Color, GameFilters } from './PlayerSource';

interface RepertoireSpyMoveProviderOptions {
    openingTree: OpeningTree;
    filters: GameFilters;
    databaseColor?: Color.White | Color.Black;
    minGames: number;
    random?: () => number;
}

function moveGameCount(move: { white: number; black: number; draws: number }): number {
    return move.white + move.black + move.draws;
}

function toUci(fen: string, san: string): string | null {
    try {
        const chess = new Chess({ fen });
        const move = chess.move(san);
        if (!move) {
            return null;
        }
        return move.uci ?? `${move.from}${move.to}${move.promotion ?? ''}`;
    } catch {
        return null;
    }
}

export function createRepertoireSpyMoveProvider({
    openingTree,
    filters,
    databaseColor,
    minGames,
    random = Math.random,
}: RepertoireSpyMoveProviderOptions): BotMoveProvider {
    const playFilters = databaseColor ? { ...filters, color: databaseColor } : filters;

    return ({ fen }): BotMoveResult | null => {
        const position = openingTree.getPosition(fen, playFilters);
        if (!position) {
            return null;
        }

        const totalGames = position.white + position.black + position.draws;
        if (totalGames < minGames) {
            return null;
        }

        const candidates = position.moves
            .map((move) => ({
                san: move.san,
                count: moveGameCount(move),
                uci: toUci(fen, move.san),
            }))
            .filter((move): move is { san: string; count: number; uci: string } =>
                Boolean(move.uci && move.count > 0),
            );

        if (candidates.length === 0) {
            return null;
        }

        const totalWeight = candidates.reduce((sum, move) => sum + move.count, 0);
        let target = random() * totalWeight;
        for (const move of candidates) {
            target -= move.count;
            if (target <= 0) {
                return { uci: move.uci, san: move.san, source: 'repertoire-spy' };
            }
        }

        const fallback = candidates[candidates.length - 1];
        return { uci: fallback.uci, san: fallback.san, source: 'repertoire-spy' };
    };
}
