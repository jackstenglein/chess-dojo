/**
 * The page layouts. Analysis view 2 puts the players and clocks in a column
 * beside the board, the way chess.com shows a broadcast.
 */
export type WcLayout = 'stream' | 'analysis' | 'analysis2';

const LAYOUTS: readonly WcLayout[] = ['stream', 'analysis', 'analysis2'];

/** A saved layout, or null for anything that is not one, such as an old or unset value. */
export function parseLayout(value: unknown): WcLayout | null {
    return LAYOUTS.includes(value as WcLayout) ? (value as WcLayout) : null;
}

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
