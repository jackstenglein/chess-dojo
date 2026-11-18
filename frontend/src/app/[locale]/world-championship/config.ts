import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    WC_GAMES,
    WC_LOCK_AT_UTC,
    WcPlayerId,
} from '@jackstenglein/chess-dojo-common/src/lead/worldChampionship';

/**
 * Everything the team may need to change during the World Championship contest,
 * in one place. The page reads the clock and this file, so nothing has to be
 * redeployed at the moment predictions lock.
 */

/**
 * Game 1 starts on Tuesday, November 24, 2026 at 15:00 in Geneva (CET, UTC+1).
 * Predictions lock at this moment, in the browser and in the lead service. The
 * moment itself is set in the common package, which both of them read.
 */
export const LOCK_AT_UTC = WC_LOCK_AT_UTC;
export const LOCK_AT_MS = Date.parse(LOCK_AT_UTC);

/** The time zone of the venue, for the fallback shown before the browser's zone is known. */
export const VENUE_TIME_ZONE = 'Europe/Zurich';

export const PAGE_PATH = '/world-championship';

export type PlayerId = WcPlayerId;

export const PLAYERS: Record<PlayerId, { name: string; fullName: string; country: string }> = {
    gukesh: { name: 'Gukesh', fullName: 'Gukesh Dommaraju', country: 'India' },
    sindarov: { name: 'Sindarov', fullName: 'Javokhir Sindarov', country: 'Uzbekistan' },
};

/**
 * The day of each classical game, from the FIDE schedule (tickets.fide.com and
 * the match regulations, checked November 13, 2026). Every game starts at 15:00
 * in Geneva. Rest days fall after games 3, 6, 9 and 12.
 */
export const GAME_DATES = [
    '2026-11-24',
    '2026-11-25',
    '2026-11-26',
    '2026-11-28',
    '2026-11-29',
    '2026-11-30',
    '2026-12-02',
    '2026-12-03',
    '2026-12-04',
    '2026-12-06',
    '2026-12-07',
    '2026-12-08',
    '2026-12-10',
    '2026-12-11',
];

/** Tiebreaks, if the classical games end 7-7. */
export const TIEBREAK_DATE = '2026-12-12';

export const MATCH = {
    /** Classical games in the match. */
    games: WC_GAMES,
    /** Points that win the match, in half points. 15 half points is 7.5. */
    winningHalfPoints: 15,
};

// ---------------------------------------------------------------------------
// Prizes. [NEED: Kostya to confirm]. Nothing below renders while `confirmed`
// is false: no prize section, no prize sentence in the hero, no prize rules.
// ---------------------------------------------------------------------------

export interface Prizes {
    confirmed: boolean;
    /** Fills "the closest entry wins {first}" in the hero. */
    first: string;
    places: { place: string; prize: string; detail?: string }[];
}

export const PRIZES: Prizes = {
    confirmed: false,
    first: 'a year of ChessDojo Workshops',
    places: [
        {
            place: '1st place',
            prize: 'A year of Workshops',
            detail: 'About six live classes a week with GMs and IMs. $804 on its own.',
        },
        {
            place: '2nd and 3rd place',
            prize: 'A year of Core',
            detail: 'The training plan for your rating. $144 on its own.',
        },
        {
            place: '4th to 10th place',
            prize: 'One recorded workshop course from the ChessDojo shop',
        },
    ],
};

// ---------------------------------------------------------------------------
// Sensei picks. [NEED: picks from Jesse, Kostya and David, in their own words].
// The section renders only when this list has entries.
// ---------------------------------------------------------------------------

export interface SenseiPick {
    name: string;
    pick: string;
    reason: string;
}

export const SENSEI_PICKS: SenseiPick[] = [];

// ---------------------------------------------------------------------------
// Eligibility. [NEED: Kostya to confirm who can enter and any country limits
// for prizes]. While false, the "Who can enter?" answer and the eligibility
// rule stay off the page.
// ---------------------------------------------------------------------------

export const ELIGIBILITY_CONFIRMED = false;

// ---------------------------------------------------------------------------
// Black Friday. [NEED: Kostya to pick option A or B, confirm the dates and
// whether entrants get early access. NEED: Jack to create the Stripe promotion
// code]. The block renders only when `confirmed` is true, `promoCode` is set
// and the clock is inside the window.
// ---------------------------------------------------------------------------

export type OfferTier =
    SubscriptionTier.Basic | SubscriptionTier.Lecture | SubscriptionTier.GameReview;

export interface OfferPlan {
    tier: OfferTier;
    name: string;
    description: string;
    /** The normal price of a year, in USD. */
    yearPrice: number;
    /** What the buyer pays for the first year under this option, in USD. */
    offerPrice: number;
}

export interface OfferOption {
    heading: string;
    /** One sentence on what the buyer gets. */
    summary: string;
    /** Follows the price, as in "$804 for 15 months". */
    priceUnit: string;
    /** Shown under the plans. Undefined for options with nothing to add. */
    renewalNote?: string;
    plans: OfferPlan[];
}

const PLAN_COPY = {
    core: 'A training plan for your rating, with daily and weekly tasks.',
    workshops: 'About six live classes a week with GMs and IMs, all recorded.',
    review: 'A review team at your rating and a weekly sensei review, plus every workshop.',
};

export const OFFER_OPTIONS: Record<'A' | 'B', OfferOption> = {
    A: {
        heading: 'Yearly plans: 15 months for the price of 12',
        summary: 'Pay for a year and your plan runs for 15 months.',
        priceUnit: 'for 15 months',
        plans: [
            {
                tier: SubscriptionTier.Basic,
                name: 'Core',
                description: PLAN_COPY.core,
                yearPrice: 144,
                offerPrice: 144,
            },
            {
                tier: SubscriptionTier.Lecture,
                name: 'Workshops',
                description: PLAN_COPY.workshops,
                yearPrice: 804,
                offerPrice: 804,
            },
            {
                tier: SubscriptionTier.GameReview,
                name: 'Sensei Review',
                description: PLAN_COPY.review,
                yearPrice: 2160,
                offerPrice: 2160,
            },
        ],
    },
    // [NEED: Kostya to check these prices]. They are the ones in the plan, but only
    // Core is exactly 25% off. 25% off $804 is $603 and 25% off $2,160 is $1,620.
    // Either the prices or the heading has to change before option B goes live.
    B: {
        heading: 'Yearly plans: 25% off your first year',
        summary: 'Pay yearly and the first year costs 25% less.',
        priceUnit: 'for the first year',
        renewalNote: 'The second year renews at the normal yearly price.',
        plans: [
            {
                tier: SubscriptionTier.Basic,
                name: 'Core',
                description: PLAN_COPY.core,
                yearPrice: 144,
                offerPrice: 108,
            },
            {
                tier: SubscriptionTier.Lecture,
                name: 'Workshops',
                description: PLAN_COPY.workshops,
                yearPrice: 804,
                offerPrice: 599,
            },
            {
                tier: SubscriptionTier.GameReview,
                name: 'Sensei Review',
                description: PLAN_COPY.review,
                yearPrice: 2160,
                offerPrice: 1800,
            },
        ],
    },
};

export interface BlackFridayOffer {
    confirmed: boolean;
    /** Switching the offer is this one line. */
    option: 'A' | 'B';
    /**
     * The code buyers type at Stripe checkout. The site cannot prefill it, so the
     * block stays hidden until a real code is here.
     */
    promoCode: string;
    /** When the offer opens to everyone. */
    startsAt: string;
    /** Tuesday, December 1, 2026 at 11:59 PM Pacific. */
    endsAt: string;
    /** Shown in the block as the deadline. */
    endsLabel: string;
    /** True once Kostya confirms that entrants get the offer early. */
    earlyAccessConfirmed: boolean;
    earlyAccessStartsAt: string;
    /** Fills the line entrants see before the offer opens. */
    earlyAccessLabel: string;
}

export const BF_OFFER: BlackFridayOffer = {
    confirmed: false,
    option: 'A',
    promoCode: '',
    startsAt: '2026-11-27T08:00:00Z',
    endsAt: '2026-12-02T07:59:59Z',
    endsLabel: 'Tuesday, December 1 at 11:59 PM Pacific',
    earlyAccessConfirmed: false,
    earlyAccessStartsAt: '2026-11-24T08:00:00Z',
    earlyAccessLabel: 'November 24',
};

// ---------------------------------------------------------------------------
// Results. Filled in by hand after the match. While this is null the page is
// "open" before the lock and "live" after it. Once it is set the page shows
// the results state.
// ---------------------------------------------------------------------------

export interface Results {
    winner: PlayerId;
    tiebreaks: boolean;
    /** The final classical score as played, for example "7.5-6.5" or "7-7". */
    classicalScore: string;
    /** How many classical games were played, 8 to 14. */
    classicalGames: number;
    decisiveGames: number;
    /** The number of the first classical game with a winner, or null if all were drawn. */
    firstDecisiveGame: number | null;
    game1Moves: number;
    /** Display names as entered. Empty until the winners are known. */
    winners: { place: string; name: string; points: number }[];
}

export const RESULTS = null as Results | null;

/** Which hero headline is live. "C" names the prize, so it falls back to "A" until prizes are confirmed. */
export const HEADLINE_VARIANT = 'A' as 'A' | 'B' | 'C';

export interface ContestConfig {
    lockAt: number;
    prizes: Prizes;
    senseiPicks: SenseiPick[];
    eligibilityConfirmed: boolean;
    offer: BlackFridayOffer;
    results: Results | null;
    headline: 'A' | 'B' | 'C';
}

export const CONTEST: ContestConfig = {
    lockAt: LOCK_AT_MS,
    prizes: PRIZES,
    senseiPicks: SENSEI_PICKS,
    eligibilityConfirmed: ELIGIBILITY_CONFIRMED,
    offer: BF_OFFER,
    results: RESULTS,
    headline: HEADLINE_VARIANT,
};

export type ContestPhase = 'open' | 'live' | 'finished';

export function getPhase(now: number, config: ContestConfig = CONTEST): ContestPhase {
    if (config.results) {
        return 'finished';
    }
    return now < config.lockAt ? 'open' : 'live';
}

export type OfferStatus = 'hidden' | 'early-access-teaser' | 'live';

/**
 * Whether the Black Friday block shows. Entrants get it from the early access
 * date when that is confirmed. Everyone else gets it from `startsAt`.
 */
export function getOfferStatus(
    now: number,
    hasEntry: boolean,
    offer: BlackFridayOffer = BF_OFFER,
): OfferStatus {
    if (!offer.confirmed || !offer.promoCode.trim() || now >= Date.parse(offer.endsAt)) {
        return 'hidden';
    }
    if (now >= Date.parse(offer.startsAt)) {
        return 'live';
    }
    if (!offer.earlyAccessConfirmed || !hasEntry) {
        return 'hidden';
    }
    return now >= Date.parse(offer.earlyAccessStartsAt) ? 'live' : 'early-access-teaser';
}
