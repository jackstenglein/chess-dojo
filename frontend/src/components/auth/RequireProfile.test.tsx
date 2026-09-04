import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequireProfile } from './RequireProfile';

const mocks = vi.hoisted(() => ({
    pathname: '/profile/edit',
    locale: 'en',
    router: {
        push: vi.fn(),
        replace: vi.fn(),
    },
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
        user: { language: 'de' },
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
    it('leaves language navigation to the profile editor while settings are being edited', () => {
        render(<RequireProfile />);

        expect(mocks.setLocaleCookie).not.toHaveBeenCalled();
        expect(mocks.router.replace).not.toHaveBeenCalled();
    });

    it('still applies the preferred language outside the profile editor', async () => {
        mocks.pathname = '/calendar';
        render(<RequireProfile />);

        await waitFor(() => expect(mocks.setLocaleCookie).toHaveBeenCalledWith('de'));
        expect(mocks.router.replace).toHaveBeenCalledWith('/calendar', { locale: 'de' });
    });
});
