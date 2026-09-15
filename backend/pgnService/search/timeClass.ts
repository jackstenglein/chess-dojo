/** The speed class of a game, derived from its PGN TimeControl header. */
export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'daily';

const STAGE_REGEX = /^(\d+)(?:\+(\d+))?$/;
const MOVES_PER_SECONDS_REGEX = /^(\d+)\/(\d+)$/;
const SECONDS_PER_DAY = 86400;

/**
 * Classifies a PGN TimeControl header ("5400+30", "600", "1/86400",
 * "40/7200:3600") into a speed class using the lichess thresholds on
 * estimated duration = base + 40 x increment. Returns undefined for
 * missing or unparseable controls ("-", "?", "*180").
 */
export function timeClass(timeControl?: string): TimeClass | undefined {
    if (!timeControl) {
        return undefined;
    }

    const stage = timeControl.split(':')[0];

    const movesPerSeconds = MOVES_PER_SECONDS_REGEX.exec(stage);
    if (movesPerSeconds) {
        const seconds = parseInt(movesPerSeconds[2]);
        return seconds >= SECONDS_PER_DAY ? 'daily' : classify(seconds);
    }

    const baseIncrement = STAGE_REGEX.exec(stage);
    if (!baseIncrement) {
        return undefined;
    }
    return classify(parseInt(baseIncrement[1]) + 40 * parseInt(baseIncrement[2] || '0'));
}

/** Maps an estimated game duration in seconds to a speed class (lichess thresholds). */
function classify(seconds: number): TimeClass {
    if (seconds < 180) {
        return 'bullet';
    }
    if (seconds < 480) {
        return 'blitz';
    }
    if (seconds < 1500) {
        return 'rapid';
    }
    return 'classical';
}
