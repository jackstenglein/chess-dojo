import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { savePendingCheckout } from '../../class/classLead';
import {
    COUPON,
    FREE_ACCOUNTS_CAN_PLAY,
    JESSE_BEST,
    LEAD_CAPTURE,
    offerLabel,
    PLANS,
    SCENES,
} from '../content';
import { RushDemoRun } from '../rushStorage';
import { DojoWeek, formatMinutes } from './DojoWeek';
import { Plans } from './Plans';
import { RunComplete } from './RunComplete';
import { LADDER_FRAMES, STORY_MISSES } from './RushScenes';
import { Unlock } from './Unlock';
import { WhyItWorks } from './WhyItWorks';

const mocks = vi.hoisted(() => ({
    auth: { status: 'Unauthenticated', user: undefined as object | undefined },
    push: vi.fn(),
    onSubscribe: vi.fn(),
    trackEvent: vi.fn(),
    metaLead: vi.fn(),
    post: vi.fn(),
}));

vi.mock('@/api/axiosService', () => ({
    axiosService: { post: mocks.post },
}));

vi.mock('@/components/landing/fonts', () => {
    const font = { style: { fontFamily: 'test-font' } };
    return { anton: font, barlow: font, barlowCondensed: font };
});

vi.mock('@/components/landing/main-background.webp', () => ({
    default: { src: '/background.webp', height: 1, width: 1 },
}));

vi.mock('next/image', () => ({
    default: () => null,
}));

vi.mock('@/style/ChessDojoIcon', () => ({
    ChessDojoIcon: () => null,
}));

vi.mock('./RushBoard', () => ({
    StaticBoard: () => null,
}));

vi.mock('@/components/navigation/Link', () => ({
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/auth/Auth', () => ({
    AuthStatus: {
        Loading: 'Loading',
        Authenticated: 'Authenticated',
        Unauthenticated: 'Unauthenticated',
    },
    useAuth: () => mocks.auth,
}));

vi.mock('@/hooks/useRouter', () => ({
    useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/api/Request', () => ({
    RequestSnackbar: () => null,
}));

vi.mock('@/analytics/events', () => ({
    EventType: {
        RushDemoOfferClick: 'rush_demo_offer_click',
        RushDemoCodeCopy: 'rush_demo_code_copy',
        RushDemoLeadStart: 'rush_demo_lead_start',
        RushDemoLead: 'rush_demo_lead',
        RushDemoShare: 'rush_demo_share',
    },
    trackEvent: mocks.trackEvent,
}));

vi.mock('@/analytics/meta', () => ({
    metaLead: mocks.metaLead,
}));

vi.mock('../../(scoreboard)/prices/useOnSubscribe', () => ({
    useOnSubscribe: () => ({
        tier: undefined,
        request: { isLoading: () => false },
        onSubscribe: mocks.onSubscribe,
    }),
}));

function run(solved: number, misses = 2): RushDemoRun {
    return {
        solved,
        attempted: solved + misses,
        accuracy: 80,
        highestSolved: 1250,
        timeSeconds: 462,
        endReason: 'strikes',
        finishedAt: `2026-11-13T12:0${solved % 10}:00.000Z`,
        misses: Array.from({ length: misses }, (_, index) => ({
            puzzleId: `m${index}`,
            fen: 'fen',
            moves: ['e2e4', 'e7e5'],
            rating: 900,
        })),
        puzzleIds: [],
        attempts: [
            ...Array.from({ length: solved }, (_, index) => ({
                puzzleId: `s${index}`,
                rating: 300 + index * 50,
                result: 'win' as const,
                seconds: 20,
            })),
            ...Array.from({ length: misses }, (_, index) => ({
                puzzleId: `m${index}`,
                rating: 900,
                result: 'loss' as const,
                seconds: 5,
            })),
        ],
    };
}

beforeEach(() => {
    window.localStorage.clear();
    mocks.post.mockReset().mockResolvedValue({ data: null });
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            observe() {
                return undefined;
            }
            disconnect() {
                return undefined;
            }
        },
    );
    mocks.auth = { status: 'Unauthenticated', user: undefined };
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});

describe('RunComplete', () => {
    it('shows the result of the run and what is left to unlock', () => {
        const onStart = vi.fn();
        const onReview = vi.fn();
        render(
            <RunComplete
                runs={[run(14, 3)]}
                onStart={onStart}
                onReview={onReview}
                loadFailed={false}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Run 1: 14 solved');
        expect(screen.getByText('80%')).toBeTruthy();
        expect(screen.getByText('1250')).toBeTruthy();
        expect(screen.getByText('7:42')).toBeTruthy();
        expect(screen.getByText('2 runs left. Finish all three to unlock 25% off.')).toBeTruthy();
        expect(screen.getByRole('img', { name: '1 of 3 runs done' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Start run 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Go through my 3 misses' }));
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onReview).toHaveBeenCalledTimes(1);
    });

    it('charts the run and opens a missed puzzle straight from the chart', () => {
        const onReview = vi.fn();
        render(
            <RunComplete
                runs={[run(14, 3)]}
                onStart={vi.fn()}
                onReview={onReview}
                loadFailed={false}
            />,
        );

        expect(
            screen.getByText(
                'Your misses took 5s on average and your solves took 20s. The misses were the fast ones.',
            ),
        ).toBeTruthy();
        // The hardest solve is picked first. The second miss is column 16 of 17.
        expect(
            screen
                .getByRole('button', { name: 'Puzzle 14 of 17, rated 950, solved in 20s' })
                .getAttribute('aria-pressed'),
        ).toBe('true');
        expect(screen.queryByRole('button', { name: 'Try it again' })).toBeNull();

        fireEvent.click(
            screen.getByRole('button', { name: 'Puzzle 16 of 17, rated 900, missed in 5s' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Try it again' }));

        expect(onReview).toHaveBeenCalledWith(1);
    });

    it('copies a result the visitor can paste anywhere', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText }, maxTouchPoints: 0 });
        render(
            <RunComplete
                runs={[run(4, 1)]}
                onStart={vi.fn()}
                onReview={vi.fn()}
                loadFailed={false}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Share my result' }));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Copied to your clipboard' })).toBeTruthy(),
        );
        const text = writeText.mock.calls[0][0] as string;
        expect(text).toContain('Dojo Rush: 4 solved, 80% accuracy, hardest 1250');
        expect(text).toContain('/rush');
        expect(mocks.trackEvent).toHaveBeenCalledWith('rush_demo_share', {
            placement: 'run_complete',
            solved: 4,
        });
    });

    it('leaves out the review button after a run without a miss', () => {
        render(
            <RunComplete
                runs={[run(9), run(20, 0)]}
                onStart={vi.fn()}
                onReview={vi.fn()}
                loadFailed={false}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Run 2: 20 solved');
        expect(screen.getByRole('button', { name: 'Start run 3' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Go through/ })).toBeNull();
    });
});

describe('Unlock, while the coupon is switched off', () => {
    const runs = [run(9), run(14), run(17)];

    beforeEach(() => {
        COUPON.confirmed = false;
    });

    afterEach(() => {
        COUPON.confirmed = true;
    });

    function fillAndSubmit(email: string, consent: boolean) {
        fireEvent.change(screen.getByLabelText(/Your email/), { target: { value: email } });
        if (consent) {
            fireEvent.click(screen.getByRole('checkbox'));
        }
        fireEvent.click(screen.getByRole('button', { name: 'Send my code' }));
    }

    it('shows the best of three and asks for an email, with no code on screen', () => {
        render(<Unlock runs={runs} onReview={vi.fn()} />);

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
            'Three runs done. Your best: 17.',
        );
        expect(screen.getByText('Your 25% off is unlocked.')).toBeTruthy();
        expect(screen.getByText('Tell us where to send the code.')).toBeTruthy();
        expect(COUPON.confirmed).toBe(false);
        expect(document.body.textContent).not.toContain(COUPON.code);
        expect(document.body.textContent).not.toContain('Jesse');
        expect(screen.queryByRole('button', { name: 'Copy code' })).toBeNull();
    });

    it('asks for a valid email and consent before sending anything', () => {
        render(<Unlock runs={runs} onReview={vi.fn()} />);

        fillAndSubmit('nope', false);

        expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
        expect(screen.getByText('Tick the box so we can email you the code.')).toBeTruthy();
        expect(mocks.post).not.toHaveBeenCalled();
    });

    it('sends the lead with the best score and confirms it', async () => {
        window.localStorage.setItem(
            'classLanding.attribution',
            JSON.stringify({ utm_source: 'twitch' }),
        );
        render(<Unlock runs={runs} onReview={vi.fn()} />);

        fillAndSubmit('player@example.com', true);

        await waitFor(() =>
            expect(
                screen.getByText('Your 25% code is on its way to player@example.com.'),
            ).toBeTruthy(),
        );
        // The lead service takes the lead: it saves it and emails the code.
        expect(mocks.post).toHaveBeenCalledWith(
            '/public/lead',
            {
                type: 'RUSH_DEMO',
                email: 'player@example.com',
                rush: { bestScore: 17, scores: [9, 14, 17] },
                attribution: { utm_source: 'twitch' },
            },
            { functionName: 'registerLead' },
        );
        expect(mocks.metaLead).toHaveBeenCalledTimes(1);
        expect(mocks.trackEvent).toHaveBeenCalledWith('rush_demo_lead', { best_score: 17 });
    });

    it('does not claim a code is coming when the lead service refuses the lead', async () => {
        mocks.post.mockRejectedValue(new Error('Request failed with status code 400'));
        render(<Unlock runs={runs} onReview={vi.fn()} />);

        fillAndSubmit('player@example.com', true);

        await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
        expect(screen.queryByText(/on its way/)).toBeNull();
        expect(mocks.metaLead).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Send my code' })).toBeTruthy();
    });

    it('handles a failed request the same way', async () => {
        mocks.post.mockRejectedValue(new Error('Network Error'));
        render(<Unlock runs={runs} onReview={vi.fn()} />);

        fillAndSubmit('player@example.com', true);

        await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
        expect(screen.queryByText(/on its way/)).toBeNull();
    });
});

describe('Unlock, with the code on screen', () => {
    const runs = [run(9), run(14), run(17)];
    const terms = COUPON.terms;

    afterEach(() => {
        COUPON.confirmed = true;
        COUPON.terms = terms;
        JESSE_BEST.confirmed = false;
        FREE_ACCOUNTS_CAN_PLAY.confirmed = false;
    });

    it('shows the code, its terms and a copy button when the coupon is confirmed', async () => {
        COUPON.terms = 'Takes 25% off your first payment on any plan.';
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        render(<Unlock runs={runs} onReview={vi.fn()} />);

        expect(screen.getByText('Here is your 25% off')).toBeTruthy();
        expect(screen.getByText(COUPON.code)).toBeTruthy();
        expect(screen.getByText(/^Takes 25% off your first payment on any plan./)).toBeTruthy();
        // With the code on screen the email is a courtesy, offered under the main button.
        expect(LEAD_CAPTURE.ready).toBe(true);
        expect(screen.getByRole('button', { name: 'Email me the code' })).toBeTruthy();
        expect(offerLabel()).toBe('Use my 25% off');
        expect(screen.getByRole('button', { name: 'Use my 25% off' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));

        await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy());
        expect(writeText).toHaveBeenCalledWith(COUPON.code);
        expect(mocks.trackEvent).toHaveBeenCalledWith('rush_demo_code_copy', {
            placement: 'unlock',
        });
    });

    it('leaves the email form out when lead capture is switched off', () => {
        LEAD_CAPTURE.ready = false;
        try {
            render(<Unlock runs={runs} onReview={vi.fn()} />);

            expect(screen.getByText(COUPON.code)).toBeTruthy();
            expect(screen.queryByRole('button', { name: 'Email me the code' })).toBeNull();
        } finally {
            LEAD_CAPTURE.ready = true;
        }
    });

    it('reminds an unlocked buyer of the code above the plans', () => {
        render(<Plans unlocked />);
        expect(screen.getByRole('note').textContent).toBe(`Enter ${COUPON.code} at checkout.`);
    });

    it('compares the visitor with Jesse only when his best is confirmed', () => {
        JESSE_BEST.confirmed = true;
        render(<Unlock runs={runs} onReview={vi.fn()} />);
        expect(screen.getByText(`GM Jesse Kraai’s best is ${JESSE_BEST.score}.`)).toBeTruthy();
    });

    it('offers a free account only when free play is confirmed', () => {
        render(<Unlock runs={runs} onReview={vi.fn()} />);
        expect(screen.queryByText(/free account/)).toBeNull();
        cleanup();

        FREE_ACCOUNTS_CAN_PLAY.confirmed = true;
        render(<Unlock runs={runs} onReview={vi.fn()} />);
        const link = screen.getByRole('link', { name: 'Create a free account to keep playing' });
        expect(link.getAttribute('href')).toBe('/signup?redirectUri=%2Fpuzzles%2Frush');
    });
});

describe('the films next to the reasons', () => {
    it('plays the ladder by the real rules: a streak, drops after misses, out on the third', () => {
        const ratings = LADDER_FRAMES.map((ladder) => ladder.stack[ladder.stack.length - 1]);

        // Four solves in a row, each step bigger than the last, then a miss drops back one.
        expect(ratings.slice(0, 6)).toEqual([300, 350, 410, 480, 560, 480]);
        expect(LADDER_FRAMES[5].strikes).toBe(1);
        expect(LADDER_FRAMES.at(-1)?.strikes).toBe(3);
        expect(LADDER_FRAMES.slice(0, -1).every((ladder) => ladder.strikes < 3)).toBe(true);
    });

    it('brings back exactly the puzzles the ladder film missed', () => {
        expect(STORY_MISSES.map((miss) => miss.puzzle)).toEqual([5, 8, 12]);
        expect(STORY_MISSES[0].rating).toBe(560);
    });

    it('shows a film for each reason, each with a line for screen readers', () => {
        render(<WhyItWorks />);

        // Each film is on the page, whether or not it is the one showing.
        for (const scene of [SCENES.clock, SCENES.ladder, SCENES.review]) {
            expect(
                screen.getAllByRole('img', { name: scene.summary, hidden: true }).length,
            ).toBeGreaterThan(0);
        }
        expect(screen.getAllByText('A three minute rush').length).toBeGreaterThan(0);
        // Before a film has played, every miss is still a miss.
        expect(screen.getAllByText('Missed').length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: 'Solve' })).toBeNull();
    });
});

describe('DojoWeek', () => {
    it('opens on the day Rush sits in and lets the visitor step through the week', () => {
        render(<DojoWeek />);

        expect(
            screen
                .getByRole('tab', { name: 'Monday, 1h 20m planned' })
                .getAttribute('aria-selected'),
        ).toBe('true');
        expect(screen.getByText('One Dojo Rush run, then retry every miss')).toBeTruthy();
        expect(screen.getByText('0 of 2 tasks done · 0m of 1h 20m')).toBeTruthy();

        fireEvent.click(screen.getByRole('tab', { name: 'Tuesday, 1h 30m planned' }));

        expect(screen.getByRole('heading', { name: 'Tuesday' })).toBeTruthy();
        expect(screen.getByText('Peer review with your team')).toBeTruthy();
        expect(screen.getByText('Sensei Review')).toBeTruthy();
        expect(screen.getByText('Sensei Review plan')).toBeTruthy();
        expect(document.body.textContent).not.toContain('Game & Profile Review');
    });

    it('logs a task the way the plan does, and takes it back', () => {
        render(<DojoWeek />);
        const workshop = within(screen.getByRole('article', { name: 'Attacking 101' }));
        const rush = within(
            screen.getByRole('article', { name: 'One Dojo Rush run, then retry every miss' }),
        );

        fireEvent.click(workshop.getByRole('button', { name: 'Log training' }));

        expect(workshop.getByRole('button', { name: 'Logged' })).toBeTruthy();
        expect(screen.getByText('1 of 2 tasks done · 1h of 1h 20m')).toBeTruthy();
        expect(screen.getByText('This week: 1h of 11h 35m')).toBeTruthy();

        fireEvent.click(rush.getByRole('button', { name: 'Log training' }));

        expect(screen.getByText('Done for the day · 1h 20m logged')).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'Monday, 1h 20m planned, done' })).toBeTruthy();

        fireEvent.click(workshop.getByRole('button', { name: 'Logged' }));

        expect(screen.getByText('1 of 2 tasks done · 20m of 1h 20m')).toBeTruthy();
    });

    it('starts a real run from the Rush task, while the visitor has runs left', () => {
        const onStart = vi.fn();
        render(<DojoWeek onStart={onStart} />);

        fireEvent.click(screen.getByRole('button', { name: 'Play this run now' }));
        expect(onStart).toHaveBeenCalledTimes(1);
        cleanup();

        render(<DojoWeek />);
        expect(screen.queryByRole('button', { name: 'Play this run now' })).toBeNull();
    });

    it('writes minutes the way the training plan does', () => {
        expect(formatMinutes(20)).toBe('20m');
        expect(formatMinutes(60)).toBe('1h');
        expect(formatMinutes(80)).toBe('1h 20m');
    });
});

describe('Plans', () => {
    it('lists the three plans with their yearly prices', () => {
        render(<Plans unlocked={false} />);

        expect(screen.getByRole('heading', { name: 'Core' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Workshops' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Sensei Review' })).toBeTruthy();
        expect(
            screen.getByRole('heading', { name: 'Dojo Rush comes with every plan' }),
        ).toBeTruthy();
        expect(screen.getByText('Billed $144 once a year.')).toBeTruthy();
        expect(screen.getByText('Billed $804 once a year.')).toBeTruthy();
        expect(screen.getByText('Billed $2,160 once a year.')).toBeTruthy();
        expect(screen.queryByRole('note')).toBeNull();
    });

    it('tells an unlocked visitor where the code goes, without showing one, while the coupon is off', () => {
        COUPON.confirmed = false;
        try {
            render(<Plans unlocked />);

            expect(screen.getByRole('note').textContent).toContain('Add promotion code');
            expect(document.body.textContent).not.toContain(COUPON.code);
            expect(screen.queryByText(/for your first year/)).toBeNull();
        } finally {
            COUPON.confirmed = true;
        }
    });

    it('shows an unlocked visitor the first payment with the code, and lets them copy it', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        render(<Plans unlocked />);

        expect(screen.getByRole('note').textContent).toBe('Enter WCC2026 at checkout.');
        expect(
            screen.getByText('$108 for your first year with WCC2026, then $144 a year.'),
        ).toBeTruthy();
        expect(
            screen.getByText('$1,620 for your first year with WCC2026, then $2,160 a year.'),
        ).toBeTruthy();

        fireEvent.click(screen.getByRole('radio', { name: 'Billed monthly' }));
        expect(
            screen.getByText('$56.25 for your first month with WCC2026, then $75 a month.'),
        ).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy());
        expect(writeText).toHaveBeenCalledWith('WCC2026');
        expect(mocks.trackEvent).toHaveBeenCalledWith('rush_demo_code_copy', {
            placement: 'plans',
        });
    });

    it('keeps the discount off the plans until the three runs are done', () => {
        render(<Plans unlocked={false} />);

        expect(document.body.textContent).not.toContain(COUPON.code);
        expect(screen.queryByText(/for your first/)).toBeNull();
    });

    it('sends a logged-out buyer to sign up and remembers the plan', () => {
        render(<Plans unlocked />);

        fireEvent.click(screen.getByRole('radio', { name: 'Billed monthly' }));
        fireEvent.click(screen.getByRole('button', { name: 'Join Sensei Review' }));

        expect(mocks.push).toHaveBeenCalledWith('/signup?redirectUri=%2Frush');
        expect(mocks.onSubscribe).not.toHaveBeenCalled();
        const pending = window.localStorage.getItem('classLanding.pendingCheckout');
        expect(pending).toContain('GAME_REVIEW');
        expect(pending).toContain('"interval":"month"');
        expect(mocks.trackEvent).toHaveBeenCalledWith(
            'rush_demo_offer_click',
            expect.objectContaining({ placement: 'plans', interval: 'month' }),
        );
    });

    it('resumes checkout after sign up, once', async () => {
        const workshops = PLANS[1].offer;
        savePendingCheckout(workshops.tier, 'year');
        mocks.auth = { status: 'Authenticated', user: { username: 'player' } };

        render(<Plans unlocked />);

        await waitFor(() => expect(mocks.onSubscribe).toHaveBeenCalledTimes(1));
        expect(mocks.onSubscribe).toHaveBeenCalledWith(workshops.tier, 'year', {
            currency: 'USD',
            value: workshops.price.year,
        });
        expect(window.localStorage.getItem('classLanding.pendingCheckout')).toBeNull();
    });

    it('starts checkout directly for a logged-in buyer', () => {
        mocks.auth = { status: 'Authenticated', user: { username: 'player' } };
        render(<Plans unlocked={false} />);

        fireEvent.click(screen.getByRole('button', { name: 'Join Core' }));

        expect(mocks.push).not.toHaveBeenCalled();
        expect(mocks.onSubscribe).toHaveBeenCalledWith(PLANS[0].offer.tier, 'year', {
            currency: 'USD',
            value: 12,
        });
    });

    it('waits for auth to load before allowing a purchase', () => {
        mocks.auth = { status: 'Loading', user: undefined };
        render(<Plans unlocked={false} />);

        const button = screen.getByRole('button', { name: 'Join Workshops' });
        expect((button as HTMLButtonElement).disabled).toBe(true);
    });
});
