import type { RatingEditor } from '@/components/profile/edit/RatingsEditor';
import { RatingSystem, User } from '@/database/user';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileEditorPage } from './ProfileEditorPage';

const mocks = vi.hoisted(() => ({
    api: {
        updateUser: vi.fn(),
    },
    guardEnabled: undefined as undefined | (() => boolean),
    guardStatesAtPush: [] as boolean[],
    routerPush: vi.fn(),
    setLocaleCookie: vi.fn(),
}));

vi.mock('@/analytics/events', () => ({
    EventType: { EditProfile: 'EditProfile' },
    setUserProperties: vi.fn(),
    trackEvent: vi.fn(),
}));

vi.mock('@/api/Api', () => ({
    useApi: () => mocks.api,
}));

vi.mock('@/api/cache/Cache', () => ({
    useCache: () => ({ setImageBypass: vi.fn() }),
}));

vi.mock('@/components/navigation/Link', () => ({
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/profile/edit/NotificationSettingsEditor', () => ({
    default: ({
        notificationSettings,
        setNotificationSettings,
    }: {
        notificationSettings: Record<string, unknown>;
        setNotificationSettings: (settings: Record<string, unknown>) => void;
    }) => (
        <button
            onClick={() =>
                setNotificationSettings({
                    ...notificationSettings,
                    testNotification: true,
                })
            }
        >
            Change notifications
        </button>
    ),
}));

vi.mock('@/components/profile/edit/PersonalAccessTokensEditor', () => ({
    PersonalAccessTokensEditor: () => null,
}));

vi.mock('@/components/profile/edit/PersonalInfoEditor', () => ({
    PersonalInfoEditor: ({ setLanguage }: { setLanguage: (language: string) => void }) => (
        <button onClick={() => setLanguage('de')}>Change language</button>
    ),
}));

vi.mock('@/components/profile/edit/RatingsEditor', () => ({
    RatingsEditor: ({
        ratingEditors,
        ratingSystem,
        setRatingEditors,
    }: {
        ratingEditors: Record<RatingSystem, RatingEditor>;
        ratingSystem: RatingSystem;
        setRatingEditors: (ratingEditors: Record<RatingSystem, RatingEditor>) => void;
    }) => (
        <button
            onClick={() =>
                setRatingEditors({
                    ...ratingEditors,
                    [ratingSystem]: {
                        ...ratingEditors[ratingSystem],
                        currentRating: '1600',
                    },
                })
            }
        >
            Change rating
        </button>
    ),
}));

vi.mock('@/components/profile/edit/ResetProgressButton', () => ({
    ResetProgressButton: () => null,
}));

vi.mock('@/components/profile/edit/SubscriptionManager', () => ({
    default: () => null,
}));

vi.mock('@/hooks/useRouter', () => ({
    useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('@/i18n/locales', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/i18n/locales')>();
    return { ...actual, setLocaleCookie: mocks.setLocaleCookie };
});

vi.mock('next-intl', () => ({
    useTranslations: () => {
        const t = (key: string) => (key === 'save' ? 'Save' : key);
        t.has = () => false;
        return t;
    },
}));

vi.mock('next-navigation-guard', () => ({
    useNavigationGuard: ({ enabled }: { enabled: boolean | (() => boolean) }) => {
        mocks.guardEnabled = typeof enabled === 'function' ? enabled : () => enabled;
        return { active: false, accept: vi.fn(), reject: vi.fn() };
    },
}));

const user = {
    username: 'test-user',
    displayName: 'Test User',
    dojoCohort: '1500-1600',
    ratingSystem: RatingSystem.Chesscom,
    ratings: {
        [RatingSystem.Chesscom]: {
            username: 'test-user',
            startRating: 1500,
            currentRating: 1500,
            hideUsername: false,
        },
    },
    notificationSettings: {},
} as User;

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    mocks.guardEnabled = undefined;
    mocks.guardStatesAtPush = [];
    mocks.api.updateUser.mockResolvedValue({});
    mocks.routerPush.mockImplementation(() => {
        mocks.guardStatesAtPush.push(mocks.guardEnabled?.() ?? false);
    });
});

describe('ProfileEditorPage', () => {
    const changeRatingAndSave = async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Change rating' }));

        const saveButton = screen.getByTestId('save-ratings-button');
        await waitFor(() => expect(saveButton).toBeEnabled());
        fireEvent.click(saveButton);
    };

    it('navigates without triggering the guard after saving the only changed section', async () => {
        render(<ProfileEditorPage user={user} />);

        await changeRatingAndSave();

        await waitFor(() => expect(mocks.routerPush).toHaveBeenCalledWith('/profile'));
        expect(mocks.routerPush).toHaveBeenCalledTimes(1);
        expect(mocks.guardStatesAtPush).toEqual([false]);
    });

    it('keeps the guard enabled when another section still has unsaved changes', async () => {
        render(<ProfileEditorPage user={user} />);

        fireEvent.click(screen.getByRole('button', { name: 'Change notifications' }));
        await changeRatingAndSave();

        await waitFor(() => expect(screen.getByTestId('save-ratings-button')).toBeDisabled());
        expect(mocks.routerPush).not.toHaveBeenCalled();
        expect(mocks.guardEnabled?.()).toBe(true);
    });

    it('keeps the guard enabled when saving fails', async () => {
        mocks.api.updateUser.mockRejectedValue(new Error('Update failed'));
        render(<ProfileEditorPage user={user} />);

        await changeRatingAndSave();

        expect(await screen.findByText('Update failed')).toBeInTheDocument();
        expect(mocks.routerPush).not.toHaveBeenCalled();
        expect(mocks.guardEnabled?.()).toBe(true);
    });

    it('applies a saved language after the remaining changes are discarded', async () => {
        render(<ProfileEditorPage user={user} />);

        fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
        fireEvent.click(screen.getByRole('button', { name: 'Change notifications' }));

        const savePersonalButton = screen.getByTestId('save-personal-button');
        await waitFor(() => expect(savePersonalButton).toBeEnabled());
        fireEvent.click(savePersonalButton);

        await waitFor(() => expect(savePersonalButton).toBeDisabled());
        expect(mocks.setLocaleCookie).not.toHaveBeenCalled();
        expect(mocks.guardEnabled?.()).toBe(true);

        fireEvent.click(screen.getByTestId('cancel-notifications-button'));

        await waitFor(() => expect(mocks.setLocaleCookie).toHaveBeenCalledWith('de'));
        expect(mocks.routerPush).not.toHaveBeenCalled();
        expect(mocks.guardEnabled?.()).toBe(false);
    });
});
