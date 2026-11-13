import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BF_OFFER, CONTEST, ContestConfig, LOCK_AT_MS, Results } from '../config';
import { CONFIRMATION, FINISHED, FLOW, HERO, LIVE, NOT_AFFILIATED } from '../content';
import { loadEntry, Picks, saveEntry } from '../prediction';
import { WorldChampionshipPage } from '../WorldChampionshipPage';
import { BlackFriday } from './BlackFriday';
import { PickFlow } from './PickFlow';

const mocks = vi.hoisted(() => ({
    auth: { status: 'Unauthenticated', user: undefined as object | undefined },
    push: vi.fn(),
    onSubscribe: vi.fn(),
    trackEvent: vi.fn(),
    metaLead: vi.fn(),
}));

vi.mock('@/components/landing/fonts', () => {
    const font = { style: { fontFamily: 'test-font' } };
    return { anton: font, barlow: font, barlowCondensed: font };
});

vi.mock('@/components/navigation/Link', () => ({
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// The test runner hands image imports over as plain URLs, without the sizes next/image needs.
vi.mock('next/image', () => ({
    default: ({ alt }: { alt: string }) => <span role='img' aria-label={alt} />,
}));

vi.mock('@/config', () => ({
    getConfig: () => ({ baseUrl: 'https://www.chessdojo.club' }),
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
        WcPickStart: 'wc_pick_start',
        WcPickStep: 'wc_pick_step',
        WcPredictionSubmit: 'wc_prediction_submit',
        WcShare: 'wc_share',
        WcOfferClick: 'wc_offer_click',
    },
    trackEvent: mocks.trackEvent,
}));

vi.mock('@/analytics/meta', () => ({
    metaLead: mocks.metaLead,
}));

vi.mock('../../(scoreboard)/prices/useOnSubscribe', () => ({
    useOnSubscribe: () => ({
        request: { isLoading: () => false },
        onSubscribe: mocks.onSubscribe,
    }),
}));

const picks: Picks = {
    winner: 'sindarov',
    tiebreaks: false,
    score: '7.5-5.5',
    decisiveGames: 4,
    firstDecisiveGame: 3,
    game1Moves: 41,
};

const HOUR = 60 * 60 * 1000;

function stubFetch(response: { status?: number; body?: object } | Error) {
    const fetchMock =
        response instanceof Error
            ? vi.fn().mockRejectedValue(response)
            : vi.fn().mockResolvedValue({
                  ok: (response.status ?? 200) < 400,
                  status: response.status ?? 200,
                  json: () => Promise.resolve(response.body ?? {}),
              });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

beforeEach(() => {
    window.localStorage.clear();
    // Only the date is faked, so the flow's short timers and waitFor still run.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(LOCK_AT_MS - 5 * 24 * HOUR);
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
    Element.prototype.scrollIntoView = vi.fn();
    mocks.auth = { status: 'Unauthenticated', user: undefined };
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});

async function pick(question: string, answer: string | RegExp) {
    await screen.findByRole('heading', { name: question });
    fireEvent.click(screen.getByRole('radio', { name: answer }));
}

async function answerAllPicks() {
    await pick('Who wins the match?', 'Sindarov');
    await pick('Does it go to tiebreaks?', 'Decided in the classical games');
    await pick('What is the final classical score?', /7\.5-5\.5/);
    await pick('How many classical games end with a winner?', '4');
    await pick('Which game is the first one with a winner?', '3');
    await screen.findByRole('heading', { name: 'How many moves will Game 1 last?' });
    fireEvent.click(screen.getByRole('button', { name: 'One move more' }));
    fireEvent.click(screen.getByRole('button', { name: FLOW.next }));
    await screen.findByRole('heading', { name: FLOW.email.title });
}

function fillEmail(email: string, consent: boolean) {
    fireEvent.change(screen.getByLabelText(/Your email/), { target: { value: email } });
    if (consent) {
        fireEvent.click(screen.getByRole('checkbox'));
    }
    fireEvent.click(screen.getByRole('button', { name: FLOW.email.submit }));
}

describe('PickFlow', () => {
    it('takes five picks, a tie-breaker and an email, then stores the entry', async () => {
        const fetchMock = stubFetch({ body: { stored: true } });
        render(<PickFlow onClosed={vi.fn()} />);

        await answerAllPicks();
        fireEvent.change(screen.getByLabelText(/Name on your picks card/), {
            target: { value: 'Pat' },
        });
        fillEmail('player@example.com', true);

        await waitFor(() => expect(loadEntry()?.picks).toEqual(picks));
        expect(loadEntry()?.displayName).toBe('Pat');
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/wc-prediction');
        expect(JSON.parse(init.body as string)).toMatchObject({
            kind: 'prediction',
            email: 'player@example.com',
            displayName: 'Pat',
            consent: true,
            picks,
        });
        expect(
            mocks.trackEvent.mock.calls.filter(([type]) => type === 'wc_pick_start'),
        ).toHaveLength(1);
        expect(mocks.trackEvent).toHaveBeenCalledWith('wc_pick_step', {
            step: 1,
            step_id: 'winner',
        });
        expect(mocks.trackEvent).toHaveBeenCalledWith('wc_prediction_submit', {
            winner: 'sindarov',
            score: '7.5-5.5',
        });
        expect(mocks.metaLead).toHaveBeenCalledTimes(1);
    });

    it('keeps the picks across a reload', async () => {
        const first = render(<PickFlow onClosed={vi.fn()} />);
        await pick('Who wins the match?', 'Gukesh');
        await screen.findByRole('heading', { name: 'Does it go to tiebreaks?' });
        first.unmount();

        render(<PickFlow onClosed={vi.fn()} />);
        expect(screen.getByRole('heading', { name: 'Does it go to tiebreaks?' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: FLOW.back }));
        const gukesh = await screen.findByRole('radio', { name: 'Gukesh' });
        expect(gukesh.getAttribute('aria-checked')).toBe('true');
    });

    it('skips the score question after a tiebreak pick and greys out impossible counts', async () => {
        render(<PickFlow onClosed={vi.fn()} />);
        await pick('Who wins the match?', 'Gukesh');
        await pick('Does it go to tiebreaks?', 'Tied 7-7, decided in tiebreaks');

        await screen.findByRole('heading', { name: 'How many classical games end with a winner?' });
        expect(screen.getByRole('radio', { name: '3' })).toBeDisabled();
        expect(screen.getByRole('radio', { name: '4' })).toBeEnabled();
        expect(screen.getByText(FLOW.greyedOut)).toBeTruthy();

        fireEvent.click(screen.getByRole('radio', { name: '0' }));
        await screen.findByRole('heading', { name: 'Which game is the first one with a winner?' });
        expect(screen.getByRole('radio', { name: 'None' })).toBeEnabled();
        expect(screen.getByRole('radio', { name: '1' })).toBeDisabled();
    });

    it('says which pick to change when an earlier answer makes a later one impossible', async () => {
        render(<PickFlow onClosed={vi.fn()} />);
        await pick('Who wins the match?', 'Sindarov');
        await pick('Does it go to tiebreaks?', 'Decided in the classical games');
        await pick('What is the final classical score?', /7\.5-6\.5/);
        await pick('How many classical games end with a winner?', '1');
        await screen.findByRole('heading', { name: 'Which game is the first one with a winner?' });

        fireEvent.click(screen.getByRole('button', { name: FLOW.back }));
        await screen.findByRole('heading', { name: 'How many classical games end with a winner?' });
        fireEvent.click(screen.getByRole('button', { name: FLOW.back }));
        await pick('What is the final classical score?', /7\.5-3\.5 or bigger/);

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toBe(
            'A 7.5-3.5 or bigger finish needs at least 4 games with a winner. Raise this number, or go back and change the score.',
        );
        expect(screen.getByRole('button', { name: FLOW.next })).toBeDisabled();
    });

    it('asks for a valid email and consent before sending anything', async () => {
        const fetchMock = stubFetch({ body: { stored: true } });
        render(<PickFlow onClosed={vi.fn()} />);
        await answerAllPicks();

        fillEmail('nope', false);

        expect(screen.getByText(FLOW.email.emailError)).toBeTruthy();
        expect(screen.getByText(FLOW.email.consentError)).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(loadEntry()).toBeUndefined();
    });

    it('does not claim the picks are in when they were not stored', async () => {
        stubFetch({ body: { stored: false } });
        render(<PickFlow onClosed={vi.fn()} />);
        await answerAllPicks();

        fillEmail('player@example.com', true);

        expect((await screen.findByRole('alert')).textContent).toBe(FLOW.email.saveError);
        expect(loadEntry()).toBeUndefined();
        expect(mocks.trackEvent).not.toHaveBeenCalledWith(
            'wc_prediction_submit',
            expect.anything(),
        );
    });

    it('tells the page when the server says predictions have closed', async () => {
        stubFetch({ status: 409, body: { error: 'closed' } });
        const onClosed = vi.fn();
        render(<PickFlow onClosed={onClosed} />);
        await answerAllPicks();

        fillEmail('player@example.com', true);

        await waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1));
        expect(loadEntry()).toBeUndefined();
    });
});

describe('WorldChampionshipPage', () => {
    it('opens with the first question and none of the unconfirmed blocks', () => {
        render(<WorldChampionshipPage serverNow={Date.now()} />);

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
            'Gukesh or Sindarov?Call it before Game 1.',
        );
        expect(screen.getByRole('heading', { name: 'Who wins the match?' })).toBeTruthy();
        expect(screen.getByText(HERO.sub)).toBeTruthy();
        // Once in the rules and once in the footer.
        expect(screen.getAllByText(NOT_AFFILIATED)).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: HERO.cta }).length).toBeGreaterThan(0);

        expect(screen.queryByText('What you can win')).toBeNull();
        expect(screen.queryByText('What the senseis think')).toBeNull();
        expect(screen.queryByText('Black Friday')).toBeNull();
        expect(screen.queryByText('Who can enter?')).toBeNull();
        expect(document.body.textContent).not.toMatch(/NEED|TODO|undefined|\{[a-z]+\}/);
    });

    it('names the prize in the hero only once prizes are confirmed', () => {
        const config: ContestConfig = {
            ...CONTEST,
            prizes: { ...CONTEST.prizes, confirmed: true },
            headline: 'C',
        };
        render(<WorldChampionshipPage serverNow={Date.now()} config={config} />);

        expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
            'Win a year of live classes.',
        );
        expect(
            screen.getByText(/the closest entry wins a year of ChessDojo Workshops\./),
        ).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'What you can win' })).toBeTruthy();
    });

    it('falls back to headline A while a prize headline has no confirmed prize', () => {
        render(
            <WorldChampionshipPage serverNow={Date.now()} config={{ ...CONTEST, headline: 'C' }} />,
        );
        expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
            'Gukesh or Sindarov?',
        );
    });

    it('shows a returning entrant their picks and the free class', () => {
        saveEntry({ picks, displayName: 'Pat', submittedAt: new Date().toISOString() });
        render(<WorldChampionshipPage serverNow={Date.now()} />);

        expect(screen.getByRole('heading', { name: CONFIRMATION.heading })).toBeTruthy();
        const card = screen.getByTestId('picks-card');
        expect(card.textContent).toContain('Sindarov');
        expect(card.textContent).toContain('Pat');
        expect(card.textContent).toContain('www.chessdojo.club/world-championship');
        expect(
            screen.getByRole('link', { name: CONFIRMATION.classInvite.cta }).getAttribute('href'),
        ).toBe('/class');
        expect(screen.queryByRole('heading', { name: 'Who wins the match?' })).toBeNull();
    });

    it('lets an entrant change their picks before the lock', async () => {
        saveEntry({ picks, displayName: 'Pat', submittedAt: new Date().toISOString() });
        render(<WorldChampionshipPage serverNow={Date.now()} />);

        fireEvent.click(screen.getByRole('button', { name: CONFIRMATION.changePicks }));

        await screen.findByRole('heading', { name: 'Who wins the match?' });
        expect(screen.getByRole('radio', { name: 'Sindarov' }).getAttribute('aria-checked')).toBe(
            'true',
        );
    });

    it('copies the page link from the picks card', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });
        saveEntry({ picks, displayName: '', submittedAt: new Date().toISOString() });
        render(<WorldChampionshipPage serverNow={Date.now()} />);

        fireEvent.click(screen.getByRole('button', { name: CONFIRMATION.copyLink }));

        await screen.findByText(CONFIRMATION.linkCopied);
        expect(writeText).toHaveBeenCalledWith(
            'https://www.chessdojo.club/world-championship?utm_source=share&utm_medium=picks_card',
        );
        expect(mocks.trackEvent).toHaveBeenCalledWith('wc_share', { method: 'copy_link' });
    });

    it('closes predictions once Game 1 has started and offers the results by email', async () => {
        vi.setSystemTime(LOCK_AT_MS + HOUR);
        const fetchMock = stubFetch({ body: { stored: true } });
        render(<WorldChampionshipPage serverNow={Date.now()} />);

        expect(screen.getByRole('heading', { name: LIVE.heading })).toBeTruthy();
        expect(screen.queryByRole('heading', { name: 'Who wins the match?' })).toBeNull();
        expect(screen.queryByRole('button', { name: HERO.cta })).toBeNull();

        fireEvent.change(screen.getByLabelText(/Your email/), {
            target: { value: 'fan@example.com' },
        });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: LIVE.submit }));

        await screen.findByText(LIVE.done);
        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(JSON.parse(init.body as string)).toMatchObject({
            kind: 'results',
            email: 'fan@example.com',
            consent: true,
        });
    });

    it('shows an entrant their picks while the match is on', () => {
        vi.setSystemTime(LOCK_AT_MS + HOUR);
        saveEntry({ picks, displayName: 'Pat', submittedAt: new Date().toISOString() });
        render(<WorldChampionshipPage serverNow={Date.now()} />);

        expect(screen.getByText(LIVE.subWithEntry)).toBeTruthy();
        expect(screen.getByTestId('picks-card')).toBeTruthy();
        expect(screen.queryByRole('button', { name: CONFIRMATION.changePicks })).toBeNull();
    });

    it('shows the results and an entrant’s score once results are in', () => {
        vi.setSystemTime(LOCK_AT_MS + 20 * 24 * HOUR);
        const results: Results = {
            winner: 'gukesh',
            tiebreaks: false,
            classicalScore: '8-5',
            classicalGames: 13,
            decisiveGames: 5,
            firstDecisiveGame: 3,
            game1Moves: 38,
            winners: [{ place: '1st', name: 'A test entrant', points: 15 }],
        };
        saveEntry({ picks, displayName: 'Pat', submittedAt: new Date().toISOString() });
        render(<WorldChampionshipPage serverNow={Date.now()} config={{ ...CONTEST, results }} />);

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
            FINISHED.heading('Gukesh'),
        );
        expect(screen.getByText('8-5')).toBeTruthy();
        expect(screen.getByText('A test entrant')).toBeTruthy();
        // Tiebreak call, score group, off by one on the count and first win: 2 + 5 + 1 + 3.
        expect(screen.getByText(FINISHED.yourScore(11))).toBeTruthy();
    });

    it('shows the Black Friday block only inside its confirmed window', () => {
        const offer = { ...BF_OFFER, confirmed: true, promoCode: 'TESTCODE' };
        vi.setSystemTime(Date.parse(offer.startsAt) + HOUR);
        const live = render(
            <WorldChampionshipPage serverNow={Date.now()} config={{ ...CONTEST, offer }} />,
        );
        expect(screen.getByRole('heading', { name: /15 months for the price of 12/ })).toBeTruthy();
        live.unmount();

        vi.setSystemTime(Date.parse(offer.endsAt) + HOUR);
        render(<WorldChampionshipPage serverNow={Date.now()} config={{ ...CONTEST, offer }} />);
        expect(screen.queryByRole('heading', { name: /15 months for the price of 12/ })).toBeNull();
    });
});

describe('BlackFriday', () => {
    const offer = { ...BF_OFFER, confirmed: true, promoCode: 'TESTCODE', option: 'B' as const };

    it('sends a logged-out buyer to sign up with the yearly plan remembered', () => {
        render(<BlackFriday offer={offer} />);

        expect(screen.getByText('Enter the code TESTCODE at checkout.')).toBeTruthy();
        expect(screen.getByText('The second year renews at the normal yearly price.')).toBeTruthy();
        fireEvent.click(screen.getByRole('radio', { name: /Core/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Choose my plan' }));

        expect(mocks.push).toHaveBeenCalledWith('/signup?redirectUri=%2Fworld-championship');
        expect(mocks.onSubscribe).not.toHaveBeenCalled();
        const pending = window.localStorage.getItem('classLanding.pendingCheckout') ?? '';
        expect(pending).toContain('BASIC');
        expect(pending).toContain('"interval":"year"');
        expect(mocks.trackEvent).toHaveBeenCalledWith('wc_offer_click', {
            placement: 'offer',
            tier: 'BASIC',
        });
    });

    it('starts yearly checkout for a logged-in buyer', () => {
        mocks.auth = { status: 'Authenticated', user: { username: 'player' } };
        render(<BlackFriday offer={offer} />);

        fireEvent.click(screen.getByRole('button', { name: 'Choose my plan' }));

        expect(mocks.onSubscribe).toHaveBeenCalledWith('LECTURE', 'year', {
            currency: 'USD',
            value: 599,
        });
    });
});
