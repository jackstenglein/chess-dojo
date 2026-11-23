'use client';

import { WC_LICHESS_TOUR_ID } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { useEffect, useState } from 'react';

export type CrossPlayer = 'gukesh' | 'sindarov';

export const CROSS_PLAYERS: { id: CrossPlayer; name: string }[] = [
    { id: 'gukesh', name: 'Gukesh' },
    { id: 'sindarov', name: 'Sindarov' },
];

export interface CrossGame {
    /** 1 for Game 1. */
    number: number;
    white?: CrossPlayer;
    /** "1-0", "0-1", "1/2-1/2", or "*" while not finished. */
    result: string;
}

export interface Crosstable {
    games: CrossGame[];
    /** Points per player, counting finished games only. */
    totals: Record<CrossPlayer, number>;
}

export function playerOf(name: string | undefined): CrossPlayer | undefined {
    if (!name) {
        return undefined;
    }
    if (/gukesh/i.test(name)) {
        return 'gukesh';
    }
    if (/sindarov/i.test(name)) {
        return 'sindarov';
    }
    return undefined;
}

/**
 * Reads the game number, White and the result of every game in the match
 * PGN. Only the headers are read, so this stays cheap for 14 games of moves.
 */
export function parseMatchPgn(pgn: string): Crosstable {
    const byNumber = new Map<number, CrossGame>();
    for (const chunk of pgn.split(/(?=\[Event )/)) {
        const tag = (name: string) => new RegExp(`\\[${name} "([^"]*)"\\]`).exec(chunk)?.[1];
        const number = parseInt(tag('Round') ?? '');
        if (!Number.isFinite(number)) {
            continue;
        }
        byNumber.set(number, {
            number,
            white: playerOf(tag('White')),
            result: tag('Result') ?? '*',
        });
    }
    const games = [...byNumber.values()].sort((a, b) => a.number - b.number);
    const totals: Record<CrossPlayer, number> = { gukesh: 0, sindarov: 0 };
    for (const g of games) {
        for (const p of CROSS_PLAYERS) {
            const points = pointsFor(g, p.id);
            if (points !== undefined) {
                totals[p.id] += points;
            }
        }
    }
    return { games, totals };
}

/** The points a player scored in a game, or undefined if it is not finished. */
export function pointsFor(game: CrossGame, player: CrossPlayer): number | undefined {
    if (!game.white) {
        return undefined;
    }
    const isWhite = game.white === player;
    switch (game.result) {
        case '1-0':
            return isWhite ? 1 : 0;
        case '0-1':
            return isWhite ? 0 : 1;
        case '1/2-1/2':
            return 0.5;
        default:
            return undefined;
    }
}

/** 1, 0 and ½, and 7½ for totals. */
export function formatPoints(points: number): string {
    const whole = Math.floor(points);
    const half = points - whole >= 0.5;
    if (!half) {
        return String(whole);
    }
    return whole === 0 ? '½' : `${whole}½`;
}

/**
 * The crosstable of the match, read from the Lichess broadcast. It is read
 * again every minute, and whenever the game being shown finishes.
 */
export function useCrosstable(refreshKey: string): Crosstable | undefined {
    const [table, setTable] = useState<Crosstable>();

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const resp = await fetch(
                    `https://lichess.org/api/broadcast/${WC_LICHESS_TOUR_ID}.pgn`,
                );
                if (!resp.ok) {
                    return;
                }
                const parsed = parseMatchPgn(await resp.text());
                if (!cancelled) {
                    setTable(parsed);
                }
            } catch {
                // The table keeps its last state.
            }
        };
        void load();
        const timer = setInterval(() => void load(), 60_000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [refreshKey]);

    return table;
}
