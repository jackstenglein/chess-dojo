import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { RUSH_COUPON } from '@jackstenglein/chess-dojo-common/src/lead/rush';
import {
    applyRushResult,
    currentRushRating,
    initialRushLadder,
    PUZZLE_RUSH_DURATION_SECONDS,
    PUZZLE_RUSH_MAX_STRIKES,
    PUZZLE_RUSH_START_RATING,
    PuzzleRushLadder,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';
import { CORE_OFFER, GAME_REVIEW_OFFER, Offer, WORKSHOPS_OFFER } from '../class/content';

/**
 * Copy and settings for the /rush campaign page. English only, like /class,
 * so the copy lives here instead of messages/*.json.
 *
 * The page lets a logged-out visitor play three Dojo Rush runs, then hands over the
 * sale code. Anything the team has not confirmed yet sits behind a flag below, and
 * nothing behind a closed flag is rendered.
 */

/** The page's own path. Sign-up sends a buyer back here to finish checkout. */
export const RUSH_PAGE_PATH = '/rush';

/** Runs a browser gets before the page asks for a sign-up. */
export const RUSH_DEMO_RUN_LIMIT = 3;

export const RUSH_MINUTES = PUZZLE_RUSH_DURATION_SECONDS / 60;
export const RUSH_STRIKES = PUZZLE_RUSH_MAX_STRIKES;

/**
 * The coupon. On November 26, 2026 Kostya said to use the World Championship sale
 * for now: WCC2026, 25% off any membership, one time. The sale has no end date on
 * this page, so swap the code here when it ends.
 *
 * While `confirmed` is false the unlock screen collects an email and shows no code.
 * `code` is the Stripe promotion code, and `terms` is one plain sentence. The code
 * and the percentage come from common, because the lead service emails them too.
 */
export const COUPON: { confirmed: boolean; code: string; percentOff: number; terms: string } = {
    confirmed: true,
    code: RUSH_COUPON.code,
    percentOff: RUSH_COUPON.percentOff,
    terms: 'One-time discount on any ChessDojo membership, from the World Championship sale.',
};

/**
 * Whether the page takes an email. The lead goes to the lead service
 * (`POST /public/lead`, type RUSH_DEMO), which saves it and emails the code. The
 * form only works against a backend that has that type deployed, so this is the
 * switch to turn off if the page has to ship ahead of the backend.
 */
export const LEAD_CAPTURE = {
    ready: true,
};

/**
 * GM Jesse Kraai's all-time best in Dojo Rush, read on November 3, 2026.
 * Turn `confirmed` on once the current number is checked. Off hides the comparison
 * and switches the headline to the version without the number.
 */
export const JESSE_BEST = {
    confirmed: false,
    score: 35,
};

/** Said on stream. Shown only once Jesse has agreed to it. */
export const JESSE_QUOTE = {
    approved: false,
    text: 'It used to be fun, the puzzle rush stuff. Now you gotta actually prove your valor.',
    attribution: 'GM Jesse Kraai, on stream, November 2, 2026',
};

/**
 * Whether a free account can keep playing Dojo Rush. Not confirmed, so the page
 * sends visitors who are out of runs to the plans and never mentions a free account.
 * Turning it on adds one link under the result on the unlock screen.
 */
export const FREE_ACCOUNTS_CAN_PLAY = {
    confirmed: false,
    signupHref: '/signup?redirectUri=%2Fpuzzles%2Frush',
};

export const HERO = {
    eyebrow: 'Dojo Rush · play it here',
    headlineWithBest: `GM Jesse Kraai’s best is ${JESSE_BEST.score}. You get three runs.`,
    headline: 'Ten minutes, three strikes. How high can you climb?',
    sub: 'The puzzles get harder every time you solve one, and a third miss ends the run. Play right here.',
    /** The offer, set apart from the rules so a visitor sees what the three runs earn. */
    reward: `Finish your three runs and you get ${COUPON.percentOff}% off a ChessDojo membership.`,
    microcopy: 'No account needed. Works on your phone.',
    proof: 'ChessDojo members have moved up a rating group 4,900+ times.',
};

/**
 * The position in the hero picture: puzzle 00Uwn from the bundled pack, after the
 * opponent's first move, as a visitor would meet it in a run.
 */
export const HERO_POSITION = {
    fen: '3r1rk1/p1p2pbp/1p4p1/7n/4P2q/1P2BP2/P1B3QP/3R1R1K w - - 7 24',
    orientation: 'white' as const,
    toMove: 'White to move',
};

/**
 * The run the hero board plays by itself: three puzzles from the bundled pack
 * (00nHy, 0181c, 00jCD). Two are solved, and on the third the natural-looking
 * check is the wrong move, so a visitor sees a climb, a strike and a drop.
 * The first move of each puzzle is the opponent's.
 */
export const DEMO_RUN: {
    fen: string;
    orientation: 'white' | 'black';
    moves: string[];
    result: 'win' | 'loss';
}[] = [
    {
        fen: 'r2q1rk1/p4pbp/1pp1p1p1/4n3/2PpN3/1P4P1/PB2PP1P/1R1Q1RK1 w - - 0 16',
        orientation: 'black',
        moves: ['d1d4', 'e5f3', 'e2f3', 'g7d4'],
        result: 'win',
    },
    {
        fen: 'rnb3k1/pp3pp1/2p2p1p/8/3P4/2PBrN2/PP4PP/R3R1K1 b - - 1 15',
        orientation: 'white',
        moves: ['e3d3', 'e1e8', 'g8h7', 'e8c8'],
        result: 'win',
    },
    {
        fen: 'r4r1k/ppp1b1pp/3qQn2/6B1/8/2N5/PPP2PPP/R4RK1 w - - 3 14',
        orientation: 'black',
        moves: ['e6b3', 'd6h2'],
        result: 'loss',
    },
];

export const DEMO_CAPTION = 'This is a run. Tap the board to start yours.';

export function heroHeadline(): string {
    return JESSE_BEST.confirmed ? HERO.headlineWithBest : HERO.headline;
}

export function startLabel(runNumber: number): string {
    return `Start run ${runNumber}`;
}

/** The label of the button that leads to the plans once all three runs are done. */
export function offerLabel(): string {
    return COUPON.confirmed ? `Use my ${COUPON.percentOff}% off` : 'See the plans';
}

export function runsLeftLine(runsDone: number): string {
    const left = RUSH_DEMO_RUN_LIMIT - runsDone;
    return `${left} ${left === 1 ? 'run' : 'runs'} left. Finish all three to unlock ${COUPON.percentOff}% off.`;
}

export function missesLabel(count: number): string {
    return count === 1 ? 'Go through my miss' : `Go through my ${count} misses`;
}

export const MISSES_CLOSING_LINE = 'In the Dojo every miss comes back like this after each run.';

/** The rating after each of the first clean solves of a run, straight from the ladder code. */
export function cleanClimb(solves: number): number[] {
    let ladder: PuzzleRushLadder = initialRushLadder();
    const ratings = [currentRushRating(ladder)];
    for (let i = 0; i < solves; i++) {
        ladder = applyRushResult(ladder, 'win');
        ratings.push(currentRushRating(ladder));
    }
    return ratings;
}

/** Six clean solves, the stretch where each step is bigger than the last. */
export const CLIMB_EXAMPLE = cleanClimb(6);

export const WHY = [
    {
        title: `${capitalize(numberWord(RUSH_MINUTES))} minutes is long enough to think`,
        body: `Most puzzle rushes give you three or five minutes, and that rewards fast hands. Dojo Rush gives you ${numberWord(RUSH_MINUTES)}. The rating climbs with every puzzle you solve, so within a few minutes you are looking at positions you have to calculate.`,
    },
    {
        title: `${capitalize(numberWord(RUSH_STRIKES))} strikes, and a miss costs you ground`,
        body: 'A wrong move is a strike and drops you back to the previous rating. Guessing ends a run fast.',
    },
    {
        title: 'Every miss comes back',
        body: 'When a run ends, members go through each missed puzzle again with no timer and no strikes. That part is where the training happens.',
    },
];

export const CLIMB_CAPTION = `Six solves in a row take you from ${PUZZLE_RUSH_START_RATING} to ${CLIMB_EXAMPLE.at(-1)}.`;

export const SIMULATOR = {
    over: 'Third miss. That is the end of a run.',
};

/**
 * The three small films next to the reasons: the clock, the ladder and what happens
 * to the misses. Each has a line that says the same thing to a screen reader.
 */
export const SCENES = {
    clock: {
        title: 'The clock',
        short: 'A three minute rush',
        medium: 'A five minute rush',
        dojo: 'Dojo Rush',
        over: 'Out of time',
        before: 'Three clocks, started together.',
        after: 'The short rushes are over. You are still solving.',
        summary:
            'Three clocks run at the same pace. The three and five minute rushes run out while Dojo Rush is still going.',
    },
    ladder: {
        title: 'The ladder',
        start: `Every run starts at ${PUZZLE_RUSH_START_RATING}.`,
        solve: 'Solved. The next puzzle is harder.',
        miss: 'Missed. That is a strike, and you are back at',
        summary:
            'A run climbs with each solve, drops back after a miss and ends on the third strike.',
    },
    review: {
        title: 'After the run',
        noTimer: 'No timer',
        noStrikes: 'No strikes',
        puzzle: 'Puzzle',
        rated: 'rated',
        missed: 'Missed',
        solved: 'Solved on retry',
        caption: 'Every miss comes back after the run. Take all the time you need.',
        summary:
            'After a run, each missed puzzle comes back and is solved with no timer and no strikes.',
    },
};

export const WEEK = {
    heading: 'Rush is one drill in a full training plan',
    body: 'ChessDojo members get a plan for their rating, from 0 to 2400+, with daily tasks, a cohort of players at their level and, on the higher plans, live classes with GMs and IMs.',
    caption:
        'An example week. Team reviews come with the Sensei Review plan, and live workshops start with Workshops.',
    rushNote: 'Dojo Rush sits here',
};

/**
 * Minutes for each task of the example week, keyed by the task's short name on the
 * /class page. They are an example, like the week: a member's own plan sets its
 * times from the hours they choose to train.
 */
export const WEEK_MINUTES: Record<string, number> = {
    'Attacking 101': 60,
    'Dojo Rush + retries': 20,
    'Team peer review': 60,
    'Class homework': 30,
    'Checkmate Patterns': 60,
    'Discord with your cohort': 15,
    'Sensei review': 60,
    'Fix one habit': 30,
    'Tactics Bootcamp': 60,
    'Study group': 45,
    'Calculation 1000+': 60,
    'Long game': 90,
    'Analyze your game': 45,
    'Watch a recording': 60,
};

/** The plan a kind of task starts with. Kinds that are not listed come with every plan. */
export const WEEK_PLAN: Record<string, string> = {
    'Live workshop': 'Workshops plan',
    Homework: 'Workshops plan',
    'Game & Profile Review': 'Sensei Review plan',
};

/** Facts from the /class page's sensei section. */
export const SENSEIS = [
    {
        key: 'jesse' as const,
        title: 'GM',
        name: 'Jesse Kraai',
        line: 'He became a GM in 2007 by consistently examining his games.',
    },
    {
        key: 'kostya' as const,
        title: 'IM',
        name: 'Kostya Kavutskiy',
        line: 'A coach for the United States at World Youth and Pan-American Championships.',
    },
    {
        key: 'david' as const,
        title: 'IM',
        name: 'David Pruess',
        line: 'He helped design the Training Program to cross the 2500 barrier.',
    },
];

export const SENSEIS_HEADING = 'The senseis who run the Dojo';

export const PLANS_SECTION = {
    heading: 'Dojo Rush comes with every plan',
    body: 'Every plan includes the training plan for your rating. Live classes start with Workshops.',
};

export const MEMBERS = {
    heading: 'Rush is one drill in a full training plan',
    body: 'ChessDojo members get a plan for their rating, from 0 to 2400+, with daily tasks, a cohort of players at their level and, on the higher plans, live classes with GMs and IMs.',
    checkoutNote:
        'Secure checkout with Stripe. Cancel anytime from your profile and keep access until the period ends.',
    footnote: 'Prices in USD. Tax may be added at checkout. Plans renew until you cancel.',
};

export interface RushPlan {
    offer: Offer;
    /** Kostya is renaming the review tier, so its display name is set here. */
    name: string;
    tagline: string;
    points: string[];
}

export const PLANS: RushPlan[] = [
    {
        offer: CORE_OFFER,
        name: CORE_OFFER.name,
        tagline: 'The training plan and the community.',
        points: [
            'A training plan for your rating',
            'Dojo Rush with your history and a retry of every miss',
            'Your cohort on Discord, tournaments and opening courses',
        ],
    },
    {
        offer: WORKSHOPS_OFFER,
        name: WORKSHOPS_OFFER.name,
        tagline: 'Live classes with GMs and IMs every week.',
        points: [
            'About six live classes a week, all recorded',
            'Homework in most classes and a Discord channel for each',
            'Everything in Core',
        ],
    },
    {
        offer: GAME_REVIEW_OFFER,
        name: 'Sensei Review',
        tagline: 'A sensei looks at your own games and habits.',
        points: [
            'A team of about 10 players at your rating',
            'A weekly peer review and a weekly sensei review',
            'Everything in Workshops',
        ],
    },
];

export function planForTier(tier: SubscriptionTier): RushPlan {
    return PLANS.find((plan) => plan.offer.tier === tier) ?? PLANS[0];
}

export function couponReminder(): string | undefined {
    if (COUPON.confirmed) {
        return `Enter ${COUPON.code} at checkout.`;
    }
    return undefined;
}

/** Where the code goes. Stripe's checkout cannot be opened with a code already filled in. */
export const CHECKOUT_HINT = 'On the Stripe checkout page it goes under “Add promotion code”.';

/** A price in dollars, with cents only when there are any: 108 is "$108", 56.25 is "$56.25". */
export function formatUsd(amount: number): string {
    return `$${amount.toLocaleString('en-US', {
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * What the first payment comes to with the code. The discount is taken once, so
 * the line also says what the plan costs after that.
 */
export function firstPaymentLine(plan: RushPlan, interval: 'month' | 'year'): string {
    const full = interval === 'year' ? plan.offer.price.year * 12 : plan.offer.price.month;
    const first = Math.round(full * (100 - COUPON.percentOff)) / 100;
    const period = interval === 'year' ? 'year' : 'month';
    return `${formatUsd(first)} for your first ${period} with ${COUPON.code}, then ${formatUsd(full)} a ${period}.`;
}

/** The line next to the button in the bar pinned to the bottom of the screen. */
export function stickyLine(unlocked: boolean): string {
    if (unlocked) {
        return COUPON.confirmed
            ? `Your code ${COUPON.code} takes ${COUPON.percentOff}% off`
            : 'Your three runs are done';
    }
    return `Three runs unlock ${COUPON.percentOff}% off a membership`;
}

export const FINAL_CTA_REWARD = `Three runs, no account. Then ${COUPON.percentOff}% off a ChessDojo membership.`;

export const FAQ = [
    {
        question: 'Do I need an account?',
        answer: 'No. The three runs are played on this page.',
    },
    {
        question: 'What happens after three runs?',
        answer: [
            `You get a code for ${COUPON.percentOff}% off a ChessDojo membership.`,
            COUPON.confirmed ? COUPON.terms : '',
        ]
            .filter(Boolean)
            .join(' '),
    },
    {
        question: 'How do I use the code?',
        answer: 'Pick a plan, and enter the code on the Stripe checkout page under “Add promotion code”.',
    },
    {
        question: 'Is this the same Rush members play?',
        answer: `Same rules: ${numberWord(RUSH_MINUTES)} minutes, ${numberWord(RUSH_STRIKES)} strikes, the same rating ladder. Members also get their history, their bests and a retry of every miss.`,
    },
    {
        question: 'Where do the puzzles come from?',
        answer: 'The Lichess open puzzle database.',
    },
    {
        question: 'Does it work on a phone?',
        answer: 'Yes.',
    },
];

export const END_REASON_LABEL = {
    time: 'Time ran out',
    strikes: 'Out of strikes',
    aborted: 'Ended early',
} as const;

function numberWord(value: number): string {
    const words: Record<number, string> = { 3: 'three', 5: 'five', 10: 'ten' };
    return words[value] ?? String(value);
}

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
