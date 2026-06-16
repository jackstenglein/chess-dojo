export enum TournamentType {
    Swiss = 'SWISS',
    Arena = 'ARENA',
    GrandPrix = 'GRAND_PRIX',
    MiddlegameSparring = 'MIDDLEGAME_SPARRING',
    EndgameSparring = 'ENDGAME_SPARRING',
}

export enum LeaderboardSite {
    Lichess = 'lichess.org',
    Chesscom = 'chess.com',
}

export interface LeaderboardPlayer {
    /** The Lichess or Chess.com username of the player. */
    username: string;

    /** The Lichess or Chess.com rating of the player. */
    rating: number;

    /** The score of the player in the leaderboard. */
    score: number;
}

export interface Leaderboard {
    /**
     * The type of the leaderboard. Follows this format:
     * LEADERBOARD(_CHESSCOM)_(MONTHLY|YEARLY)_(ARENA|SWISS|GRAND_PRIX|MIDDLEGAME_SPARRING|ENDGAME_SPARRING)_(BLITZ|RAPID|CLASSICAL)
     */
    type: string;

    /**
     * The start of the period the leaderboard applies to. For the current leaderboard,
     * it is the special value CURRENT.
     */
    startsAt: string;

    /** The site that the leaderboard applies to. */
    site: LeaderboardSite;

    /** The time control of the leaderboard. */
    timeControl: 'blitz' | 'rapid' | 'classical';

    /** The players in the leaderboard. */
    players?: LeaderboardPlayer[];
}

export interface OpenClassicalPlayer {
    /** The username of the player. */
    username: string;

    /** The display name of the player. */
    displayName: string;

    /** The Lichess username of the player. */
    lichessUsername: string;

    /** The Discord username of the player. */
    discordUsername: string;

    /** The Discord id of the player. */
    discordId: string;

    /** The player's title, if they have one. */
    title: string;

    /** The player's Lichess rating at the start of the Open Classical. */
    rating: number;

    /** The player's status in the open classical. */
    status: OpenClassicalPlayerStatus;

    /** The round the player was last active, if they are currently banned or withdrawn. */
    lastActiveRound: number;
}

export enum OpenClassicalPlayerStatus {
    Active = '',
    Withdrawn = 'WITHDRAWN',
    Banned = 'BANNED',
    Unknown = 'UNKNOWN',
}

export interface OpenClassicalPairing {
    /** The player with the white pieces. */
    white: OpenClassicalPlayer;

    /** The player with the black pieces. */
    black: OpenClassicalPlayer;

    /** The result of the pairing. */
    result: string;

    /** The URL of the game that was played. */
    gameUrl: string;

    /** Whether the result is verified. */
    verified: boolean;

    /** Whether to report the opponent for failure to schedule or show up */
    reportOpponent: boolean;

    /** The notes included by the submitter when submitting */
    notes: string;

    /** The S3 keys of screenshots submitted as proof of the result. */
    screenshots: string[];
}

export interface OpenClassicalRound {
    /** The list of pairings for the round. */
    pairings: OpenClassicalPairing[];

    /** Whether pairing emails have already been sent for the round. */
    pairingEmailsSent: boolean;
}

export interface OpenClassical {
    /**
     * The start of the period the tournament applies to, or CURRENT if this
     * is the current tournament.
     */
    startsAt: string;

    /** The name of the tournament. */
    name: string;

    /** Whether the tournament is accepting registrations or not. */
    acceptingRegistrations: boolean;

    /** The sections in the tournament. */
    sections: Record<string, OpenClassicalSection>;

    /** Players who are not in good standing and cannot register, mapped by their Lichess username. */
    bannedPlayers: Record<string, OpenClassicalPlayer>;

    /** The date that registrations will close. */
    registrationClose: string;
}

export interface OpenClassicalSection {
    /** The name of the section. */
    name: string;

    region: string;

    section: string;

    players: Record<string, OpenClassicalPlayer>;

    /** The rounds in the tournament for this section. */
    rounds: OpenClassicalRound[];
}

/**
 * Returns a sorted list of the rating ranges in the given open classical.
 * @param openClassical The open classical to get the rating ranges for.
 */
export function getRatingRanges(openClassical: OpenClassical): string[] {
    let ratingRangeOptions = Object.keys(openClassical.sections).map((s) => s.split('_')[1]);
    ratingRangeOptions = ratingRangeOptions
        .filter((val, idx) => ratingRangeOptions.indexOf(val) === idx)
        .sort((lhs, rhs) => lhs.localeCompare(rhs));

    return ratingRangeOptions;
}
