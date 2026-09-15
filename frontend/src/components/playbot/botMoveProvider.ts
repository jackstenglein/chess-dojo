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
}

export async function resolveBotMove(
    context: BotMoveContext,
    {
        provider,
        getDefaultOpeningBookMove = getOpeningBookMove,
        callMaia = callMaiaApi,
    }: ResolveBotMoveDeps = {},
): Promise<BotMoveResult | null> {
    const customMove = await provider?.(context);
    if (customMove) {
        return customMove;
    }

    const bookMove = await getDefaultOpeningBookMove(
        context.fen,
        context.maiaRating,
        context.plyCount,
    );
    if (bookMove) {
        return { ...bookMove, source: 'book' };
    }

    const evalResult: MaiaEvalResult = await callMaia(context.fen, context.maiaRating);
    return {
        uci: evalResult.bestMove,
        source: 'maia',
        winProbability: evalResult.value,
    };
}
