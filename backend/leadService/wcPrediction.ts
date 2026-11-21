import {
    WC_LOCK_AT_UTC,
    WcPicks,
    WcPlayerId,
} from '@jackstenglein/chess-dojo-common/src/lead/worldChampionship';

const playerNames: Record<WcPlayerId, string> = {
    [WcPlayerId.enum.gukesh]: 'Gukesh Dommaraju',
    [WcPlayerId.enum.sindarov]: 'Javokhir Sindarov',
};

/**
 * Returns the picks of a World Championship prediction in the words used by
 * the confirmation email.
 * @param picks The picks to describe.
 * @param lockAt The moment predictions lock, as an ISO date.
 */
export function wcConfirmationData(
    picks: WcPicks,
    lockAt: string = WC_LOCK_AT_UTC,
): Record<string, string> {
    return {
        winner: playerNames[picks.winner],
        finish: picks.tiebreaks
            ? 'In tiebreaks, after 7-7 in the classical games'
            : `${picks.score === '7.5-3.5+' ? '7.5-3.5 or bigger' : picks.score} in the classical games`,
        decisiveGames: `${picks.decisiveGames}`,
        firstDecisiveGame:
            picks.firstDecisiveGame === 'none' ? 'None' : `Game ${picks.firstDecisiveGame}`,
        game1Moves: `${picks.game1Moves}`,
        lockMoment: formatLockMoment(lockAt),
    };
}

/**
 * Returns the lock moment in the time of the venue, such as
 * "Tuesday, November 24 at 15:00 Geneva time (14:00 UTC)".
 * @param lockAt The moment predictions lock, as an ISO date.
 */
function formatLockMoment(lockAt: string): string {
    const date = new Date(lockAt);
    const day = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/Zurich',
    }).format(date);
    const time = (timeZone: string) =>
        new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
            timeZone,
        }).format(date);
    return `${day} at ${time('Europe/Zurich')} Geneva time (${time('UTC')} UTC)`;
}
