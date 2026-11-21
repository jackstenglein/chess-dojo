import { ContestConfig } from './config';

/**
 * Local review only. On the dev server, `?preview=` shows the states and blocks
 * that are switched off in config.ts, so the team can approve them before they
 * go live. Production builds ignore the parameter.
 *
 *   ?preview=prizes    open state with the proposed prizes
 *   ?preview=live      the match is on, predictions closed
 *   ?preview=offer     Black Friday block, option A (add &option=B for option B)
 *   ?preview=finished  results state with made-up results
 */

export interface Preview {
    config: ContestConfig;
    /** The moment the page pretends it is. Undefined leaves the real clock running. */
    frozenAt?: number;
}

const HOUR = 60 * 60 * 1000;

export function getPreview(search: string, config: ContestConfig): Preview | undefined {
    if (process.env.NODE_ENV !== 'development') {
        return undefined;
    }
    const params = new URLSearchParams(search);
    switch (params.get('preview')) {
        case 'prizes':
            return {
                config: { ...config, prizes: { ...config.prizes, confirmed: true } },
            };
        case 'live':
            return { config, frozenAt: config.lockAt + HOUR };
        case 'offer':
            return {
                config: {
                    ...config,
                    prizes: { ...config.prizes, confirmed: true },
                    offer: {
                        ...config.offer,
                        confirmed: true,
                        option: params.get('option') === 'B' ? 'B' : 'A',
                        promoCode: 'PREVIEW-CODE',
                    },
                },
                frozenAt: Date.parse(config.offer.startsAt) + HOUR,
            };
        case 'finished':
            return {
                config: {
                    ...config,
                    results: {
                        winner: 'gukesh',
                        tiebreaks: false,
                        classicalScore: '7.5-5.5',
                        classicalGames: 13,
                        decisiveGames: 4,
                        firstDecisiveGame: 3,
                        game1Moves: 41,
                        winners: [
                            { place: '1st', name: 'Preview entry one', points: 14 },
                            { place: '2nd', name: 'Preview entry two', points: 13 },
                            { place: '3rd', name: 'Preview entry three', points: 13 },
                        ],
                    },
                },
            };
        default:
            return undefined;
    }
}
