import { DecisiveScore, MAX_POINTS, POINTS, StepId } from './prediction';

/**
 * Copy for the World Championship prediction contest page. English only, like
 * /class, so it lives here instead of messages/*.json. Anything that waits on a
 * decision from the team is switched on in config.ts, not here.
 */

export const META = {
    title: 'Predict the 2026 World Championship | ChessDojo',
    description: 'Gukesh or Sindarov? Make five picks before Game 1 on November 24. Free to enter.',
};

export const HERO = {
    eyebrow: 'World Championship 2026 · Geneva · Game 1 on November 24',
    /** A is live. B is plainer. C names the prize and is only used once prizes are confirmed. */
    headlines: {
        A: 'Gukesh or Sindarov? Call it before Game 1.',
        B: 'Call the World Championship before the first move.',
        C: 'Predict Gukesh vs Sindarov. Win a year of live classes.',
    },
    sub: 'Five picks, about a minute. Predictions lock when Game 1 starts.',
    /** Replaces the last sentence of `sub` once prizes are confirmed. */
    subWithPrize: (firstPrize: string) =>
        `Five picks, about a minute. Predictions lock when Game 1 starts, and the closest entry wins ${firstPrize}.`,
    countdownLabel: 'Predictions lock in',
    /** Shown until the browser's clock is known, so the line never jumps. */
    countdownFallback: 'Predictions lock when Game 1 starts',
    /** The lock time at the venue, shown until the browser's time zone is known. */
    lockAtVenue: 'Tuesday, November 24 at 15:00 in Geneva',
    cta: 'Make my picks',
    microcopy: 'Free to enter. One entry per person.',
    proof: 'Run by ChessDojo senseis GM Jesse Kraai, IM David Pruess and IM Kostya Kavutskiy.',
};

export const PLAYER_ROLES = {
    gukesh: 'World Champion',
    sindarov: 'Challenger',
} as const;

export interface Question {
    title: string;
    /** What the question is worth, as shown next to it. */
    points: string;
    help?: string;
}

export const QUESTIONS: Record<Exclude<StepId, 'email'>, Question> = {
    winner: {
        title: 'Who wins the match?',
        points: `${POINTS.winner} points`,
    },
    tiebreaks: {
        title: 'Does it go to tiebreaks?',
        points: `${POINTS.tiebreaks} points`,
        help: 'The match is 14 classical games. At 7-7 it goes to faster tiebreak games.',
    },
    score: {
        title: 'What is the final classical score?',
        points: `${POINTS.score} points`,
        help: 'A winner who finishes on 8 points counts by the number of games, so 8-6 is the same pick as 7.5-6.5.',
    },
    decisive: {
        title: 'How many classical games end with a winner?',
        points: `${POINTS.decisiveExact} points, or ${POINTS.decisiveOffByOne} if you are off by one`,
        help: 'Draws are left out of this count.',
    },
    first: {
        title: 'Which game is the first one with a winner?',
        points: `${POINTS.first} points`,
    },
    moves: {
        title: 'How many moves will Game 1 last?',
        points: 'Tie-breaker',
        help: 'We use this when entries finish level on points. The closest guess goes first.',
    },
};

export const TIEBREAK_OPTIONS = {
    classical: 'Decided in the classical games',
    tiebreaks: 'Tied 7-7, decided in tiebreaks',
};

export const SCORE_OPTIONS: Record<DecisiveScore, { label: string; detail: string }> = {
    '7.5-6.5': { label: '7.5-6.5', detail: 'Goes all 14 games' },
    '7.5-5.5': { label: '7.5-5.5', detail: 'Over after 13 games' },
    '7.5-4.5': { label: '7.5-4.5', detail: 'Over after 12 games' },
    '7.5-3.5+': { label: '7.5-3.5 or bigger', detail: 'Over in 11 games or fewer' },
};

export const FLOW = {
    back: 'Back',
    next: 'Next',
    pickLabel: (number: number) => `Pick ${number} of 5`,
    tieBreakerLabel: 'Tie-breaker',
    lastStepLabel: 'Last step',
    greyedOut: 'Greyed-out answers can’t happen with your earlier picks.',
    noneOption: 'None',
    movesUnit: 'moves',
    movesError: 'Enter a number of moves from 1 to 200.',
    email: {
        title: 'Where should we send your result?',
        emailLabel: 'Your email',
        nameLabel: 'Name on your picks card (optional)',
        consent: 'Email me my result and ChessDojo news. Unsubscribe anytime.',
        submit: 'Lock in my picks',
        emailError: 'Enter a valid email address.',
        consentError: 'Tick the box so we can email your result.',
        saveError:
            'We couldn’t save your picks just now. They are still here. Try again in a minute.',
        closedError: 'Game 1 has started, so predictions are closed.',
    },
};

export const CONFIRMATION = {
    heading: 'Your picks are in.',
    body: 'We’ll email your score after the final game. You can change your picks until Game 1 starts by entering again with the same email.',
    cardTitle: 'ChessDojo World Championship predictions',
    cardFallbackName: 'My picks',
    tieBreakerLine: (moves: number) => `Tie-breaker: Game 1 lasts ${moves} moves`,
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
    saveImage: 'Save image',
    changePicks: 'Change my picks',
    classInvite: {
        body: 'While you wait for Game 1, watch a full ChessDojo class free: GM Jesse Kraai, Logical Chess Move by Move, 70 minutes.',
        cta: 'Watch the class',
        href: '/class',
    },
    earlyAccess: (date: string) =>
        `Everyone who enters gets the Black Friday offer on ${date}, three days before it opens to the public.`,
    offerCta: 'Choose my plan',
};

export const SCORING = {
    heading: 'How the scoring works',
    rows: [
        { question: 'Match winner', points: `${POINTS.winner}` },
        { question: 'Tiebreaks or not', points: `${POINTS.tiebreaks}` },
        { question: 'Final classical score', points: `${POINTS.score}` },
        {
            question: 'Games with a winner',
            points: `${POINTS.decisiveExact}`,
            note: `${POINTS.decisiveOffByOne} if you are off by one`,
        },
        { question: 'First game with a winner', points: `${POINTS.first}` },
    ],
    maximumLabel: 'Maximum',
    maximum: `${MAX_POINTS}`,
    tieRule:
        'Ties are broken by the closest guess to the number of moves in Game 1, then by the earliest entry.',
    notes: [
        'A tiebreak pick sets your classical score to 7-7.',
        'A winner who finishes on 8 points counts by the number of games, so 8-6 scores as 7.5-6.5, 8-5 as 7.5-5.5 and 8-4 as 7.5-4.5.',
    ],
};

export const PRIZES_SECTION = {
    heading: 'What you can win',
};

export const SENSEI_SECTION = {
    heading: 'What the senseis think',
};

export const WHO = {
    heading: 'Who is running this',
    body: 'ChessDojo is a training program run by GM Jesse Kraai, IM David Pruess and IM Kostya Kavutskiy. Members get a training plan for their rating, about six live classes a week and a group of players at their level to train with.',
    proof: [
        { target: 4900, label: 'Graduations' },
        { target: 200000, label: 'Rating points gained' },
    ],
    footnote: 'Rating points gained by current ChessDojo members.',
    link: 'See how the program works',
    href: '/class',
    imageAlt: 'IM David Pruess, GM Jesse Kraai and IM Kostya Kavutskiy',
};

export const OFFER_SECTION = {
    eyebrow: 'Black Friday',
    deadline: (endsLabel: string) => `For Black Friday, until ${endsLabel}.`,
    code: (promoCode: string) => `Enter the code ${promoCode} at checkout.`,
    cta: 'Choose my plan',
    planGroupLabel: 'Choose a yearly plan',
    normalPrice: (price: string) => `Normally ${price} a year`,
    checkoutNote:
        'Secure checkout with Stripe. Cancel anytime from your profile and keep access until the period ends.',
    currentPlan: 'This is your current plan',
};

export interface FaqItem {
    question: string;
    answer: string;
    /** Hidden until Kostya confirms who can enter. */
    needsEligibility?: boolean;
}

/** `{lock}` is replaced with the lock time in the visitor's time zone. */
export const FAQ: FaqItem[] = [
    {
        question: 'Is it free?',
        answer: 'Yes. No purchase and no ChessDojo account needed.',
    },
    {
        question: 'Who can enter?',
        answer: 'Anyone, one entry per person.',
        needsEligibility: true,
    },
    {
        question: 'Can I change my picks?',
        answer: 'Yes, until Game 1 starts. Enter again with the same email and the latest entry counts.',
    },
    {
        question: 'When do predictions close?',
        answer: 'When Game 1 starts, {lock}.',
    },
    {
        question: 'How are ties broken?',
        answer: 'Closest guess to the number of moves in Game 1, then the earliest entry.',
    },
    {
        question: 'What do you do with my email?',
        answer: 'We send your result, and ChessDojo news if you ticked the box. Every email has an unsubscribe link.',
    },
    {
        question: 'When are winners announced?',
        answer: 'Within a few days of the final game, by email and on the ChessDojo channels.',
    },
];

export const FAQ_HEADING = 'Questions about the contest';

export interface Rule {
    text: string;
    /** Hidden until prizes are confirmed. */
    needsPrizes?: boolean;
}

export const NOT_AFFILIATED = 'ChessDojo is not affiliated with FIDE or the match organizers.';

export const RULES = {
    heading: 'Contest rules',
    items: [
        { text: 'ChessDojo runs this contest.' },
        { text: 'Entry is free. You can enter without buying anything or opening an account.' },
        {
            text: 'One entry per person. If you enter again with the same email, your latest entry counts.',
        },
        { text: 'Entries close when Game 1 starts, {lock}.' },
        {
            text: `An entry can score up to ${MAX_POINTS} points, as shown under “${SCORING.heading}”. ${SCORING.tieRule}`,
        },
        { text: 'Prizes cannot be exchanged for cash.', needsPrizes: true },
        { text: 'Winners are contacted at the email address on their entry.', needsPrizes: true },
        { text: NOT_AFFILIATED },
    ] as Rule[],
};

export const FINAL_CTA = {
    heading: (day: string) => `Game 1 starts ${day}. Get your picks in.`,
    cta: HERO.cta,
};

export const LIVE = {
    heading: 'Predictions are closed. The match is on.',
    subWithEntry:
        'If you entered, your picks are below. We’ll email your score after the final game.',
    subWithoutEntry:
        'Entries closed when Game 1 started. Leave your email and we’ll send the results and the winners after the final game.',
    emailLabel: 'Your email',
    consent: 'Email me the results and ChessDojo news. Unsubscribe anytime.',
    submit: 'Send me the results and the winners',
    consentError: 'Tick the box so we can email the results.',
    saveError: 'We couldn’t save your email just now. Try again in a minute.',
    done: 'You’re on the list. We’ll email the results after the final game.',
    picksHeading: 'Your picks',
};

export const FINISHED = {
    heading: (winner: string) => `${winner} wins the World Championship.`,
    answersHeading: 'The correct answers',
    game1Line: (moves: number) => `Game 1 lasted ${moves} moves.`,
    winnersHeading: 'Winners',
    yourScore: (points: number) => `Your picks scored ${points} of ${MAX_POINTS}.`,
    pointsLabel: (points: number) => `${points} points`,
};

export const STICKY = {
    cta: HERO.cta,
};

export const FOOTER_LINKS = [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Help', href: '/help' },
    { label: 'Free class', href: '/class' },
];

/**
 * "First sentence? Second sentence." as two strings, so a heading can give each
 * sentence its own line. Written without a lookbehind, which older iPhones
 * cannot parse.
 */
export function sentences(text: string): string[] {
    const found = text.match(/[^.?]+[.?]*/g) ?? [text];
    return found.map((sentence) => sentence.trim()).filter(Boolean);
}
