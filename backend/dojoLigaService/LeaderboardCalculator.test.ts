import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosGetMock = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
    default: {
        get: axiosGetMock,
    },
}));

import { LeaderboardCalculator } from './LeaderboardCalculator';

function toNDJSON<T>(items: T[]): string {
    return items.map((item) => JSON.stringify(item)).join('\n');
}

function swissPlayer(username: string, rank: number) {
    return { username, rank, tieBreak: 0, performance: 2000 };
}

function arenaPlayer(username: string, rank: number, team: string) {
    return { ...swissPlayer(username, rank), team };
}

describe('LeaderboardCalculator', () => {
    beforeEach(() => {
        axiosGetMock.mockReset();
    });

    it('returns an empty leaderboard when no tournaments are in the target month', async () => {
        axiosGetMock.mockImplementation(async (url: string) => {
            if (url.includes('/swiss?')) {
                return {
                    data: toNDJSON([
                        {
                            id: 'swiss-old',
                            name: 'Old Swiss',
                            startsAt: '2025-05-15T18:00:00.000Z',
                            clock: {
                                limit: 300,
                                increment: 0,
                            },
                        },
                    ]),
                };
            }
            if (url.includes('/arena?')) {
                return { data: toNDJSON([]) };
            }
            throw new Error(`Unexpected request: ${url}`);
        });

        const leaderboard = await new LeaderboardCalculator().calculate('2025-06');

        expect(leaderboard.type).toBe('DOJO_LIGA');
        expect(leaderboard.startsAt).toBe('2025-06');
        expect(leaderboard.tournaments).toEqual({});
        expect(leaderboard.players).toEqual({});
    });

    it('scores Swiss tournaments with DojoLiga points', async () => {
        axiosGetMock.mockImplementation(async (url: string) => {
            if (url.includes('/swiss?')) {
                return {
                    data: toNDJSON([
                        {
                            id: 'swiss-1',
                            name: 'June Swiss',
                            startsAt: '2025-06-15T18:00:00.000Z',
                            clock: {
                                limit: 900,
                                increment: 0,
                            },
                        },
                    ]),
                };
            }
            if (url.endsWith('/swiss/swiss-1/results')) {
                return {
                    data: toNDJSON([
                        swissPlayer('winner', 1),
                        swissPlayer('runner-up', 2),
                        swissPlayer('participant', 11),
                    ]),
                };
            }
            if (url.includes('/arena?')) {
                return { data: toNDJSON([]) };
            }
            throw new Error(`Unexpected request: ${url}`);
        });

        const leaderboard = await new LeaderboardCalculator().calculate('2025-06');

        expect(leaderboard.tournaments).toEqual({
            'swiss-1': {
                id: 'swiss-1',
                name: 'June Swiss',
                date: '2025-06-15T18:00:00.000Z',
                dojoLiga: true,
                multiplier: 1.25,
            },
        });
        expect(leaderboard.players.winner).toEqual({
            lichess: 'winner',
            score: 15,
            dojoLigaScore: 15,
            tournaments: [{ id: 'swiss-1', rank: 1, points: 15 }],
        });
        expect(leaderboard.players['runner-up']).toEqual({
            lichess: 'runner-up',
            score: 11.25,
            dojoLigaScore: 11.25,
            tournaments: [{ id: 'swiss-1', rank: 2, points: 11.25 }],
        });
        expect(leaderboard.players.participant).toEqual({
            lichess: 'participant',
            score: 1.25,
            dojoLigaScore: 1.25,
            tournaments: [{ id: 'swiss-1', rank: 11, points: 1.25 }],
        });
    });

    it('scores Arena tournaments without DojoLiga points and filters by team', async () => {
        axiosGetMock.mockImplementation(async (url: string) => {
            if (url.includes('/swiss?')) {
                return { data: toNDJSON([]) };
            }
            if (url.includes('/arena?')) {
                return {
                    data: toNDJSON([
                        {
                            id: 'arena-1',
                            fullName: 'June Arena',
                            startsAt: Date.parse('2025-06-20T18:00:00.000Z'),
                            clock: {
                                limit: 300,
                                increment: 0,
                            },
                        },
                    ]),
                };
            }
            if (url.endsWith('/tournament/arena-1/results')) {
                return {
                    data: toNDJSON([
                        arenaPlayer('other-team', 1, 'rivals'),
                        arenaPlayer('dojo-first', 2, 'chessdojo'),
                        arenaPlayer('dojo-second', 3, 'chessdojo'),
                    ]),
                };
            }
            throw new Error(`Unexpected request: ${url}`);
        });

        const leaderboard = await new LeaderboardCalculator().calculate('2025-06');

        expect(leaderboard.tournaments).toEqual({
            'arena-1': {
                id: 'arena-1',
                name: 'June Arena',
                date: '2025-06-20T18:00:00.000Z',
                dojoLiga: false,
                multiplier: 1,
            },
        });
        expect(leaderboard.players['dojo-first']).toEqual({
            lichess: 'dojo-first',
            score: 7,
            dojoLigaScore: 0,
            tournaments: [{ id: 'arena-1', rank: 1, points: 7 }],
        });
        expect(leaderboard.players['dojo-second']).toEqual({
            lichess: 'dojo-second',
            score: 6,
            dojoLigaScore: 0,
            tournaments: [{ id: 'arena-1', rank: 2, points: 6 }],
        });
        expect(leaderboard.players['other-team']).toBeUndefined();
    });

    it('accumulates scores across Swiss and Arena tournaments', async () => {
        axiosGetMock.mockImplementation(async (url: string) => {
            if (url.includes('/swiss?')) {
                return {
                    data: toNDJSON([
                        {
                            id: 'swiss-1',
                            name: 'June Swiss',
                            startsAt: '2025-06-15T18:00:00.000Z',
                            clock: {
                                limit: 900,
                                increment: 0,
                            },
                        },
                    ]),
                };
            }
            if (url.endsWith('/swiss/swiss-1/results')) {
                return { data: toNDJSON([swissPlayer('player1', 1)]) };
            }
            if (url.includes('/arena?')) {
                return {
                    data: toNDJSON([
                        {
                            id: 'arena-1',
                            fullName: 'June Arena',
                            startsAt: Date.parse('2025-06-20T18:00:00.000Z'),
                            clock: {
                                limit: 1800,
                                increment: 0,
                            },
                        },
                    ]),
                };
            }
            if (url.endsWith('/tournament/arena-1/results')) {
                return { data: toNDJSON([arenaPlayer('player1', 1, 'chessdojo')]) };
            }
            throw new Error(`Unexpected request: ${url}`);
        });

        const leaderboard = await new LeaderboardCalculator().calculate('2025-06');

        expect(leaderboard.players.player1).toEqual({
            lichess: 'player1',
            score: 25.5,
            dojoLigaScore: 15,
            tournaments: [
                { id: 'swiss-1', rank: 1, points: 15 },
                { id: 'arena-1', rank: 1, points: 10.5 },
            ],
        });
    });
});
