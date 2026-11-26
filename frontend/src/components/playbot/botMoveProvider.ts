import { MaiaEvalResult, MaiaRating, callMaiaApi } from './maiaengine';
import { getOpeningBookMove } from './openingBook';

export type BotMoveSource = 'book' | 'maia' | 'repertoire-spy';

export interface BotMoveContext {
    fen: string;
    maiaRating: MaiaRating;
    plyCount: number;
}

export interface BotMoveResult {
    uci: string;
    san?: string;
    source: BotMoveSource;
    winProbability?: number;
}

export type BotMoveProvider = (
    context: BotMoveContext,
) => BotMoveResult | null | Promise<BotMoveResult | null>;

interface ResolveBotMoveDeps {
    provider?: BotMoveProvider | null;
    getDefaultOpeningBookMove?: typeof getOpeningBookMove;
    callMaia?: typeof callMaiaApi;
    skipOpeningBook?: boolean;
    onOpeningBookFailure?: () => void;
}

export async function resolveBotMove(
    context: BotMoveContext,
    {
        provider,
        getDefaultOpeningBookMove = getOpeningBookMove,
        callMaia = callMaiaApi,
        skipOpeningBook = false,
        onOpeningBookFailure,
    }: ResolveBotMoveDeps = {},
): Promise<BotMoveResult | null> {
    const customMove = await provider?.(context);
    if (customMove) {
        return customMove;
    }

    if (!skipOpeningBook) {
        try {
            const bookMove = await getDefaultOpeningBookMove(
                context.fen,
                context.maiaRating,
                context.plyCount,
            );
            if (bookMove) {
                return { ...bookMove, source: 'book' };
            }
        } catch {
            onOpeningBookFailure?.();
        }
    }

    const evalResult: MaiaEvalResult = await callMaia(context.fen, context.maiaRating);
    return {
        uci: evalResult.bestMove,
        source: 'maia',
        winProbability: evalResult.value,
    };
}
