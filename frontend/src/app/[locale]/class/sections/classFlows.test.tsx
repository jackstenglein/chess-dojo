import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasClassAccess, savePendingCheckout } from '../classLead';
import { GateDialog } from './GateDialog';
import { OfferSection } from './OfferSection';

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
    EventType: { ClassLead: 'class_lead' },
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

beforeEach(() => {
    window.localStorage.clear();
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

describe('OfferSection', () => {
    it('sends a logged-out buyer to sign up and remembers the plan', () => {
        render(<OfferSection />);

        fireEvent.click(screen.getByRole('button', { name: 'Join Game & Profile Review' }));

        expect(mocks.push).toHaveBeenCalledWith('/signup?redirectUri=%2Fclass');
        expect(mocks.onSubscribe).not.toHaveBeenCalled();
        expect(window.localStorage.getItem('classLanding.pendingCheckout')).toContain(
            'GAME_REVIEW',
        );
    });

    it('resumes checkout after sign up, once', async () => {
        const { GAME_REVIEW_OFFER } = await import('../content');
        savePendingCheckout(GAME_REVIEW_OFFER.tier, 'year');
        mocks.auth = { status: 'Authenticated', user: { username: 'player' } };

        render(<OfferSection />);

        await waitFor(() => expect(mocks.onSubscribe).toHaveBeenCalledTimes(1));
        expect(mocks.onSubscribe).toHaveBeenCalledWith(GAME_REVIEW_OFFER.tier, 'year', {
            currency: 'USD',
            value: GAME_REVIEW_OFFER.price.year,
        });
        expect(window.localStorage.getItem('classLanding.pendingCheckout')).toBeNull();
    });

    it('waits for auth to load before allowing a purchase', () => {
        mocks.auth = { status: 'Loading', user: undefined };
        render(<OfferSection />);

        const button = screen.getByRole('button', { name: 'Join Game & Profile Review' });
        expect((button as HTMLButtonElement).disabled).toBe(true);
    });
});

describe('GateDialog', () => {
    function fillAndSubmit(email: string, consent: boolean) {
        fireEvent.change(screen.getByLabelText(/Your email/), { target: { value: email } });
        if (consent) {
            fireEvent.click(screen.getByRole('checkbox'));
        }
        fireEvent.click(screen.getByRole('button', { name: 'Start the class' }));
    }

    it('blocks the class until the email and consent are valid', () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const onUnlocked = vi.fn();
        render(<GateDialog classId='calculation' onClose={vi.fn()} onUnlocked={onUnlocked} />);

        fillAndSubmit('nope', false);

        expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
        expect(screen.getByText('Tick this box so we can send you the class.')).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(onUnlocked).not.toHaveBeenCalled();
    });

    it('posts the lead and unlocks the class', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        const onUnlocked = vi.fn();
        render(<GateDialog classId='logical-chess' onClose={vi.fn()} onUnlocked={onUnlocked} />);

        fillAndSubmit('player@example.com', true);

        await waitFor(() => expect(onUnlocked).toHaveBeenCalledWith('logical-chess'));
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/class-lead');
        expect(JSON.parse(init.body as string)).toMatchObject({
            email: 'player@example.com',
            classId: 'logical-chess',
            consent: true,
        });
        expect(hasClassAccess()).toBe(true);
        expect(mocks.metaLead).toHaveBeenCalledTimes(1);
    });

    it('still gives the visitor the class if the request fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
        const onUnlocked = vi.fn();
        render(<GateDialog classId='calculation' onClose={vi.fn()} onUnlocked={onUnlocked} />);

        fillAndSubmit('player@example.com', true);

        await waitFor(() => expect(onUnlocked).toHaveBeenCalledWith('calculation'));
    });
});
