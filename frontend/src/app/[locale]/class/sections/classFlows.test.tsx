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
    post: vi.fn(),
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

vi.mock('@/api/axiosService', () => ({
    axiosService: { post: mocks.post },
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
    mocks.post.mockReset();
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

        fireEvent.click(screen.getByRole('radio', { name: /Game & Profile Review/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Join a review team' }));

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

        const button = screen.getByRole('button', { name: 'Join this week’s live classes' });
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
        const onUnlocked = vi.fn();
        render(<GateDialog classId='CALCULATION' onClose={vi.fn()} onUnlocked={onUnlocked} />);

        fillAndSubmit('nope', false);

        expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
        expect(screen.getByText('Tick the box to get the class and our emails.')).toBeTruthy();
        expect(mocks.post).not.toHaveBeenCalled();
        expect(onUnlocked).not.toHaveBeenCalled();
    });

    it('posts the lead and unlocks the class', async () => {
        mocks.post.mockResolvedValue({ data: {} });
        const onUnlocked = vi.fn();
        render(<GateDialog classId='LOGICAL_CHESS' onClose={vi.fn()} onUnlocked={onUnlocked} />);

        fillAndSubmit('player@example.com', true);

        await waitFor(() => expect(onUnlocked).toHaveBeenCalledWith('LOGICAL_CHESS'));
        expect(mocks.post).toHaveBeenCalledWith(
            '/public/lead',
            {
                email: 'player@example.com',
                type: 'LIVE_CLASS',
                classId: 'LOGICAL_CHESS',
                attribution: {},
            },
            { functionName: 'registerLead' },
        );
        expect(hasClassAccess()).toBe(true);
        expect(mocks.metaLead).toHaveBeenCalledTimes(1);
        expect(mocks.trackEvent).toHaveBeenCalledWith('class_lead', { class_id: 'LOGICAL_CHESS' });
    });

    it('still gives the visitor the class if the request fails', async () => {
        mocks.post.mockRejectedValue(new Error('offline'));
        const onUnlocked = vi.fn();
        render(<GateDialog classId='CALCULATION' onClose={vi.fn()} onUnlocked={onUnlocked} />);

        fillAndSubmit('player@example.com', true);

        await waitFor(() => expect(onUnlocked).toHaveBeenCalledWith('CALCULATION'));
        expect(mocks.post).toHaveBeenCalledWith(
            '/public/lead',
            {
                email: 'player@example.com',
                type: 'LIVE_CLASS',
                classId: 'CALCULATION',
                attribution: {},
            },
            { functionName: 'registerLead' },
        );
    });
});
