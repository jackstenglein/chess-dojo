'use client';

import { Chess } from '@jackstenglein/chess';
import { MaiaRating } from './maiaengine';
export type PlayerColor = 'white' | 'black';

export interface MoveRecord {
    san: string;
    uci: string;
    fen: string;
    ms: number;
}

export type GameResult = 'white' | 'black' | 'draw' | null;
export type GameOverReason =
    | 'checkmate'
    | 'stalemate'
    | 'insufficient'
    | 'repetition'
    | 'fifty-move'
    | 'resign'
    | null;

export interface UsePlayBotGameResult {
    chess: Chess;
    moves: MoveRecord[];
    playerColor: PlayerColor;
    playerToMove: boolean;
    botThinking: boolean;
    result: GameResult;
    reason: GameOverReason;
    maiaRating: MaiaRating;
    maiaWinProb: number | null;
    startFen: string;
    onPlayerMove: (from: string, to: string, promotion?: string) => void;
    newGame: (opts: {
        playerColor: PlayerColor;
        maiaRating: MaiaRating;
        startFen?: string;
    }) => void;
    resign: () => void;
}

export const RATING_DESCRIPTIONS: Record<MaiaRating, string> = {
    600: 'Absolute Beginner',
    700: 'Beginner',
    800: 'Beginner',
    900: 'Casual Player',
    1000: 'Casual Player',
    1100: 'Novice',
    1200: 'Advanced Beginner',
    1300: 'Intermediate',
    1400: 'Intermediate',
    1500: 'Advanced Intermediate',
    1600: 'Club Player',
    1700: 'Strong Club Player',
    1800: 'Expert',
    1900: 'Advanced Expert',
    2000: 'Candidate Master',
    2100: 'Candidate Master',
    2200: 'FIDE Master',
    2300: 'FIDE Master',
    2400: 'International Master',
    2500: 'Grandmaster',
    2600: 'Super Grandmaster',
};
