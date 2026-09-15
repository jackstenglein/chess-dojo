import { Game, isValidDate } from '../game/types';
import { TimeClass, timeClass } from './timeClass';

/** Owners of system-generated games that are hidden from cohort listings. */
export const SYSTEM_OWNERS = ['model_games', 'games_to_memorize'];

/** The searchable metadata for a single game, stored in OpenSearch. */
export interface SearchDocument {
    cohort: string;
    id: string;
    white: string;
    black: string;
    whiteElo?: number;
    blackElo?: number;
    avgElo?: number;
    result?: string;
    eco?: string;
    opening?: string;
    date: string;
    createdAt: string;
    timeControl?: string;
    timeClass?: TimeClass;
    plyCount?: number;
    owner: string;
    ownerDisplayName: string;
}

/** Returns the OpenSearch document id for the given game. */
export function documentId(game: Pick<Game, 'cohort' | 'id'>): string {
    return `${game.cohort}#${game.id}`;
}

/**
 * Converts a Game to its SearchDocument, or undefined if the game must
 * not be indexed (unlisted or owned by a system account).
 */
export function buildSearchDocument(game: Game): SearchDocument | undefined {
    if (game.unlisted || SYSTEM_OWNERS.includes(game.owner)) {
        return undefined;
    }

    const whiteElo = optionalInt('whiteElo', game.headers?.WhiteElo);
    const blackElo = optionalInt('blackElo', game.headers?.BlackElo);
    const avgElo: Record<string, number> = {};
    if (whiteElo.whiteElo && blackElo.blackElo) {
        avgElo.avgElo = Math.round((whiteElo.whiteElo + blackElo.blackElo) / 2);
    }

    return {
        cohort: game.cohort,
        id: game.id,
        white: game.headers?.White || game.white,
        black: game.headers?.Black || game.black,
        ...whiteElo,
        ...blackElo,
        ...avgElo,
        ...optionalString('result', game.headers?.Result),
        ...optionalString('eco', game.headers?.ECO),
        ...optionalString('opening', game.headers?.Opening),
        date: searchDate(game),
        createdAt: game.createdAt,
        ...optionalString('timeControl', game.headers?.TimeControl),
        ...optionalString('timeClass', timeClass(game.headers?.TimeControl)),
        ...optionalInt('plyCount', game.headers?.PlyCount),
        owner: game.owner,
        ownerDisplayName: game.ownerDisplayName || '',
    };
}

/** Returns the game's date as ISO yyyy-MM-dd, falling back to createdAt and the id's upload date. */
function searchDate(game: Game): string {
    // isValidDate rejects calendar-invalid dates like 2024.13.45, which the
    // index's strict date mapping would refuse, failing the whole bulk batch.
    if (isValidDate(game.date)) {
        return game.date.replaceAll('.', '-');
    }
    if (game.createdAt) {
        return game.createdAt.slice(0, 10);
    }
    // Legacy games without createdAt: ids start with the upload date.
    const idDate = game.id?.split('_')[0] || '';
    return isValidDate(idDate) ? idDate.replaceAll('.', '-') : '1970-01-01';
}

/** Returns a { key: value } field with the parsed int, or an empty object when missing/non-numeric. */
function optionalInt(key: string, value?: string) {
    const parsed = parseInt(value || '');
    return isNaN(parsed) ? {} : { [key]: parsed };
}

/** Returns a { key: value } field, or an empty object when the value is missing. */
function optionalString(key: string, value?: string) {
    return value ? { [key]: value } : {};
}
