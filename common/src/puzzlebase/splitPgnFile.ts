/**
 * Splits the text of a PGN file into its games. A new game starts at a header line (`[Tag "..."]`)
 * that follows moves or comments, so games are found whether or not they end in a result such as
 * `*` or `1-0`, which puzzle PGNs often leave out. Text inside `{ }` comments is never treated as
 * a header, and a file without any headers is one game.
 */
export function splitPgnFile(text: string): string[] {
    const games: string[] = [];
    let current: string[] = [];
    let seenMoves = false;
    let commentDepth = 0;

    for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
        const trimmed = line.trim();
        const isHeader = commentDepth === 0 && /^\[[A-Za-z0-9_]+\s+"/.test(trimmed);

        if (isHeader && seenMoves) {
            games.push(current.join('\n'));
            current = [];
            seenMoves = false;
        }
        current.push(line);

        if (!isHeader && trimmed !== '') {
            seenMoves = true;
        }
        for (const char of line) {
            if (char === '{') commentDepth++;
            else if (char === '}' && commentDepth > 0) commentDepth--;
        }
    }
    games.push(current.join('\n'));

    return games.map((game) => game.trim()).filter((game) => game !== '');
}
