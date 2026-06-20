import {
    Leaderboard,
    Player,
    Tournament,
} from '@jackstenglein/chess-dojo-common/src/dojoLiga/dojoLiga';
import axios from 'axios';

/** The Lichess team id for Chess Dojo tournaments. */
const CHESS_DOJO_TEAM = 'chessdojo';

interface LichessSwissPlayer {
    /** The username of the player. */
    username: string;
    /** The 1-based index of the player. Player 1 won the tournament. */
    rank: number;
    /** The tiebreak score of the player. */
    tieBreak: number;
    /** The performance of the player in the tournament. */
    performance: number;
}

interface LichessArenaPlayer extends LichessSwissPlayer {
    /** The team the player was on. */
    team: string;
}

interface LichessTournament {
    /** The lichess id of the tournament. */
    id: string;
    /** The name of the tournament. */
    name: string;
    /** The ISO 8601 start time of the tournament. */
    startsAt: string;
    /** The time control of the tournament. */
    clock: {
        /** The initial time limit in seconds. */
        limit: number;
        /** The time increment in seconds. */
        increment: number;
    };
}

interface LichessArena {
    /** The lichess id of the arena. */
    id: string;
    /** The full display name of the arena. */
    fullName: string;
    /** The Unix timestamp in milliseconds when the arena starts. */
    startsAt: number;
    /** The time control of the arena. */
    clock: {
        /** The initial time limit in seconds. */
        limit: number;
        /** The time increment in seconds. */
        increment: number;
    };
}

/** The base number of points a player receives for participating in a Swiss. */
const BASE_SWISS_POINTS = 1;

/**
 * Maps a rank in a Swiss tournament to the bonus points the user receives
 * in the DojoLiga for that tournament.
 */
const BONUS_SWISS_POINTS_BY_RANK: Record<number, number> = {
    1: 11,
    2: 8,
    3: 6,
    4: 4,
    5: 3,
    6: 2,
    7: 2,
    8: 2,
    9: 2,
    10: 2,
};

/** The base number of points a player receives for participating in an Arena. */
const BASE_ARENA_POINTS = 2;

/**
 * Maps a rank in an Arena tournament to the bonus points the user receives
 * in the DojoLiga for that tournament.
 */
const BONUS_ARENA_POINTS_BY_RANK: Record<number, number> = {
    1: 5,
    2: 4,
    3: 3,
    4: 2,
    5: 1,
};

/**
 * Parses a newline-delimited JSON string into an array of objects.
 * @param data The raw NDJSON response body.
 */
function parseNDJSON<T>(data: string): T[] {
    return data
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as T);
}

/** Calculates DojoLiga leaderboard scores from finished Lichess team tournaments. */
export class LeaderboardCalculator {
    /** The month being scored, in YYYY-MM format. */
    private month = '';
    /** Tournaments included in the leaderboard, keyed by lichess id. */
    private tournaments: Record<string, Tournament> = {};
    /** Players in the leaderboard, keyed by lichess username. */
    private players: Record<string, Player> = {};

    /**
     * Calculates the leaderboard for the given month.
     * @param month The month to score, in YYYY-MM format.
     */
    public async calculate(month: string): Promise<Leaderboard> {
        this.month = month;
        this.tournaments = {};
        this.players = {};
        await this.scoreSwisses();
        await this.scoreArenas();
        return {
            type: 'DOJO_LIGA',
            startsAt: month,
            tournaments: this.tournaments,
            players: this.players,
        };
    }

    /** Fetches and scores finished Swiss tournaments for the current month. */
    private async scoreSwisses() {
        const swisses = await fetchSwisses();
        for (const swiss of swisses) {
            if (!swiss.startsAt.startsWith(this.month)) {
                continue;
            }
            this.tournaments[swiss.id] = {
                id: swiss.id,
                name: swiss.name,
                date: swiss.startsAt,
                dojoLiga: true,
                multiplier: getPointMultiplier(swiss.clock),
            };
            await this.scoreSwiss(swiss.id);
        }
    }

    /**
     * Fetches and scores a single Swiss tournament.
     * @param id The lichess id of the Swiss tournament.
     */
    private async scoreSwiss(id: string) {
        const players = await fetchSwissPlayers(id);
        this.scoreTournament(id, players, BASE_SWISS_POINTS, BONUS_SWISS_POINTS_BY_RANK);
    }

    /** Fetches and scores finished Arena tournaments for the current month. */
    private async scoreArenas() {
        const arenas = await fetchArenas();
        for (const arena of arenas) {
            if (!arena.startsAt.startsWith(this.month)) {
                continue;
            }
            this.tournaments[arena.id] = {
                id: arena.id,
                name: arena.name,
                date: arena.startsAt,
                dojoLiga: false,
                multiplier: getPointMultiplier(arena.clock),
            };
            await this.scoreArena(arena.id);
        }
    }

    /**
     * Fetches and scores a single Arena tournament.
     * @param id The lichess id of the Arena tournament.
     */
    private async scoreArena(id: string) {
        const players = await fetchArenaPlayers(id);
        this.scoreTournament(id, players, BASE_ARENA_POINTS, BONUS_ARENA_POINTS_BY_RANK);
    }

    /**
     * Applies base and rank bonus points for each player in a tournament.
     * @param id The lichess id of the tournament.
     * @param players The tournament players, ordered by rank.
     * @param basePoints The participation points awarded to every player.
     * @param bonusPointsByRank Bonus points keyed by 1-based finish rank.
     */
    private scoreTournament(
        id: string,
        players: LichessSwissPlayer[],
        basePoints: number,
        bonusPointsByRank: Record<number, number>,
    ) {
        const multiplier = this.tournaments[id].multiplier ?? 1;
        for (const player of players) {
            const p = this.players[player.username] ?? {
                lichess: player.username,
                score: 0,
                dojoLigaScore: 0,
                tournaments: [],
            };
            const points = (basePoints + (bonusPointsByRank[player.rank] ?? 0)) * multiplier;
            p.score += points;
            if (this.tournaments[id].dojoLiga) {
                p.dojoLigaScore += points;
            }
            p.tournaments.push({ id, rank: player.rank, points });
            this.players[p.lichess] = p;
        }
    }
}

/** Fetches recently finished Swiss tournaments for the Chess Dojo team. */
async function fetchSwisses(): Promise<LichessTournament[]> {
    const response = await axios.get<string>(
        'https://lichess.org/api/team/chessdojo/swiss?status=finished&max=20',
        {
            headers: {
                Accept: 'application/x-ndjson',
            },
        },
    );
    return parseNDJSON<LichessTournament>(response.data);
}

/** Fetches recently finished Arena tournaments for the Chess Dojo team. */
async function fetchArenas(): Promise<LichessTournament[]> {
    const response = await axios.get<string>(
        'https://lichess.org/api/team/chessdojo/arena?status=finished&max=20',
        {
            headers: {
                Accept: 'application/x-ndjson',
            },
        },
    );
    return parseNDJSON<LichessArena>(response.data).map((arena) => ({
        id: arena.id,
        name: arena.fullName,
        startsAt: new Date(arena.startsAt).toISOString(),
        clock: arena.clock,
    }));
}

/**
 * Fetches the results for a Swiss tournament.
 * @param id The lichess id of the Swiss tournament.
 */
async function fetchSwissPlayers(id: string): Promise<LichessSwissPlayer[]> {
    const response = await axios.get<string>(`https://lichess.org/api/swiss/${id}/results`, {
        headers: {
            Accept: 'application/x-ndjson',
        },
    });
    return parseNDJSON<LichessSwissPlayer>(response.data);
}

/**
 * Fetches the results for an Arena tournament, filtered to Chess Dojo team members.
 * @param id The lichess id of the Arena tournament.
 */
async function fetchArenaPlayers(id: string): Promise<LichessSwissPlayer[]> {
    const response = await axios.get<string>(`https://lichess.org/api/tournament/${id}/results`, {
        headers: {
            Accept: 'application/x-ndjson',
        },
    });
    return parseNDJSON<LichessArenaPlayer>(response.data)
        .filter((player) => player.team === CHESS_DOJO_TEAM)
        .map((player, index) => ({ ...player, rank: index + 1 }));
}

/**
 * Calculates the point multiplier for a time control.
 * @param clock The time control.
 * @returns The multiplier.
 */
function getPointMultiplier(clock: { limit: number; increment: number }): number {
    if (clock.limit <= 300) {
        // Blitz - 5 min or less
        return 1;
    }
    if (clock.limit <= 900) {
        // Rapid - 15 min or less
        return 1.25;
    }
    // Classical
    return 1.5;
}
