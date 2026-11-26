import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { RequireProfile } from './RequireProfile';

const mocks = vi.hoisted(() => ({
    pathname: '/profile/edit',
    locale: 'en',
    router: {
        push: vi.fn(),
        replace: vi.fn(),
    },
    user: { username: 'test', language: 'de' },
    setLocaleCookie: vi.fn(),
}));

vi.mock('@/api/Api', () => ({
    useApi: () => ({ checkUserAccess: vi.fn() }),
}));

vi.mock('@/api/Request', () => ({
    useRequest: () => ({
        isSent: () => true,
        onStart: vi.fn(),
        onSuccess: vi.fn(),
        onFailure: vi.fn(),
    }),
}));

vi.mock('@/auth/Auth', () => ({
    AuthStatus: { Authenticated: 'Authenticated' },
    useAuth: () => ({
        status: 'Authenticated',
        user: mocks.user,
        updateUser: vi.fn(),
    }),
}));

vi.mock('@/database/user', () => ({
    hasCreatedProfile: () => true,
}));

vi.mock('@/i18n/locales', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/i18n/locales')>();
    return { ...actual, setLocaleCookie: mocks.setLocaleCookie };
});

vi.mock('@/i18n/navigation', () => ({
    usePathname: () => mocks.pathname,
    useRouter: () => mocks.router,
}));

vi.mock('next-intl', () => ({
    useLocale: () => mocks.locale,
}));

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/profile/edit';
    mocks.locale = 'en';
});

describe('RequireProfile language navigation', () => {
    let originalLocation: Location;
    let replaceMock: Mock;

    beforeEach(() => {
        originalLocation = window.location;

        replaceMock = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { ...(originalLocation as object), replace: replaceMock, hash: '', search: '' },
            writable: true,
        });
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true,
        });
    });

    it('redirects on first entrance to profile editor', async () => {
        mocks.user.language = 'de';
        render(<RequireProfile />);

        await waitFor(() => expect(mocks.setLocaleCookie).toHaveBeenCalledWith('de'));
        expect(replaceMock).toHaveBeenCalledWith('/de/profile/edit');
    });

    it('leaves language navigation to the profile editor while settings are being edited', async () => {
        mocks.locale = 'de';
        mocks.user.language = 'de';
        const { rerender } = render(<RequireProfile />);

        await waitFor(() => expect(mocks.setLocaleCookie).toHaveBeenCalledWith('de'));
        expect(replaceMock).not.toHaveBeenCalled();

        mocks.user.language = 'en';
        rerender(<RequireProfile />);

        expect(replaceMock).not.toHaveBeenCalled();
    });

    it('still applies the preferred language outside the profile editor', async () => {
        mocks.user.language = 'de';
        mocks.pathname = '/calendar';
        render(<RequireProfile />);

        await waitFor(() => expect(mocks.setLocaleCookie).toHaveBeenCalledWith('de'));
        expect(replaceMock).toHaveBeenCalledWith('/de/calendar');
    });
});
