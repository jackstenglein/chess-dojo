/**
 * The page layouts. Analysis view 2 puts the players and clocks in a column
 * beside the board, the way chess.com shows a broadcast.
 */
export type WcLayout = 'stream' | 'analysis' | 'analysis2';

/**
 * The layout the page shows. Only senseis and guest senseis get the analysis
 * views. They start on analysis view 1, unless they picked another view with
 * the switch. A viewer always has the stream view, whatever an earlier visit saved.
 */
export function resolveLayout(saved: WcLayout | null, canAnalyze: boolean): WcLayout {
    if (!canAnalyze) {
        return 'stream';
    }
    return saved ?? 'analysis';
}
