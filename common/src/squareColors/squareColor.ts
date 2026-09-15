const FILES = 'abcdefgh';

/**
 * Returns the color of a chess square.
 * A square is dark if (fileIndex + rankIndex) is even (0-indexed).
 * @param square - The square name (e.g. "g7").
 * @returns 'black' or 'white'.
 */
export function getSquareColor(square: string): 'black' | 'white' {
    const file = FILES.indexOf(square[0]);
    const rank = parseInt(square[1], 10) - 1;
    return (file + rank) % 2 === 0 ? 'black' : 'white';
}

/**
 * Returns a random square name from a1-h8.
 * If `exclude` is provided, the returned square will differ from it.
 * @param exclude - Optional square name to exclude from the result.
 * @returns A random square name (e.g. "b3").
 */
export function getRandomSquare(exclude?: string): string {
    let square: string;
    do {
        const file = FILES[Math.floor(Math.random() * 8)];
        const rank = Math.floor(Math.random() * 8) + 1;
        square = `${file}${rank}`;
    } while (square === exclude);
    return square;
}
