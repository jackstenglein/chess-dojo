/** Saves text as a file in the browser: the same as clicking a download link. */
export function downloadText(filename: string, text: string, type = 'application/x-chess-pgn') {
    const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
