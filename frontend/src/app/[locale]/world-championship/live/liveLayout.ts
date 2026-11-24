export type WcLayout = 'stream' | 'analysis';

/**
 * The layout the page shows. Only senseis and guest senseis get the analysis
 * view. They start on it, unless they picked the stream view with the switch.
 * A viewer always has the stream view, whatever an earlier visit saved.
 */
export function resolveLayout(saved: WcLayout | null, canAnalyze: boolean): WcLayout {
    if (!canAnalyze) {
        return 'stream';
    }
    return saved ?? 'analysis';
}
