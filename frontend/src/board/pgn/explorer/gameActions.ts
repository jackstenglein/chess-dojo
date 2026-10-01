import { GameInfo } from '@/database/game';
import { Chess, CommentType, Move } from '@jackstenglein/chess';
import { parse } from '@jackstenglein/pgn-parser';

export type CitationSource = Pick<GameInfo, 'cohort' | 'id' | 'headers'>;

export function gameUrl(source: Pick<GameInfo, 'cohort' | 'id'>) {
    return `/games/${encodeURIComponent(source.cohort)}/${encodeURIComponent(source.id)}`;
}

export function citeGame(
    target: Chess,
    source: CitationSource,
    origin: string,
    move = target.currentMove(),
) {
    const url = `${origin}${gameUrl(source)}`;
    const existing = target.getComment(CommentType.After, move);
    if (existing.includes(`](${url})`)) return;
    const escape = (text: string) => text.replace(/[\\[\]]/g, '\\$&');
    const player = (name?: string, rating?: string) =>
        escape(`${name || 'NN'}${rating ? ` (${rating})` : ''}`);
    const { White, WhiteElo, Black, BlackElo, Date: date } = source.headers;
    const label = `${player(White, WhiteElo)} - ${player(Black, BlackElo)}${date ? ` ${escape(date)}` : ''}`;
    target.setComment(
        `${existing ? `${existing}\n\n` : ''}[${label}](${url})`,
        CommentType.After,
        move,
    );
}

/** Validate independently: Chess's PGN loader otherwise retains a legal prefix on error. */
export function insertGame(target: Chess, pgn: string, source: CitationSource, origin: string) {
    const parsed = parse(pgn, { startRule: 'game' });
    const validated = new Chess({ fen: parsed.tags?.FEN });
    if (!parsed.moves.length || validated.normalizedFen(null) !== target.normalizedFen(null)) {
        throw new Error('invalidSource');
    }
    for (const move of parsed.moves) {
        if (!validated.move(move.notation.notation, { disableNullMoves: true })) {
            throw new Error('invalidSource');
        }
    }

    const selected = target.currentMove();
    let previous: Move | null = null;
    for (const move of validated.history()) {
        previous = target.move(move.san, { previousMove: previous });
    }
    citeGame(target, source, origin, previous);
    target.seek(selected);
}
