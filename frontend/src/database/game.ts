import {
    CommentOwner,
    Game,
    GameInfo,
    GameKey,
    GameResult,
    GameReview,
    GameReviewStatus,
    GameReviewType,
    PgnHeaders,
    PositionComment,
} from '@jackstenglein/chess-dojo-common/src/database/game';

export { GameResult, GameReviewStatus, GameReviewType };
export type { CommentOwner, Game, GameInfo, GameKey, GameReview, PgnHeaders, PositionComment };

/**
 * Verifies whether the given value is a GameResult.
 * @param result The result to check.
 */
export function isGameResult(result?: string): result is GameResult {
    return !!Object.values(GameResult).find((r) => r === result);
}

export function isDefaultHeader(header: string): boolean {
    return (
        header === 'White' ||
        header === 'WhiteElo' ||
        header === 'Black' ||
        header === 'BlackElo' ||
        header === 'Date' ||
        header === 'Site' ||
        header === 'Result' ||
        header === 'EventDate'
    );
}

export function displayGameReviewType(
    reviewType: GameReviewType,
    t: (key: string) => string,
): string {
    switch (reviewType) {
        case GameReviewType.Quick:
            return t('reviewTypeQuick');
        case GameReviewType.Deep:
            return t('reviewTypeDeepDive');
    }
}
export const MastersCohort = 'masters';
export const MastersOwnerDisplayName = 'Masters DB';
