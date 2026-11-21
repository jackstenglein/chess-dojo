import {
    Directory,
    DirectoryAccessRole,
    DirectoryVisibility,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import {
    SubscriptionStatus,
    SubscriptionTier,
    User,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { NIL as uuidNil } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canViewDirectory, fetchSubscriptionTier, getAccessRole } from './access';
import { getUser } from './database';
import { fetchDirectory } from './get';

vi.mock('./database', () => ({ getUser: vi.fn() }));
vi.mock('./get', () => ({ fetchDirectory: vi.fn() }));

const owner = 'owner';
const viewer = 'viewer';
const childId = '2bca0358-bbfc-46f0-b28d-e850ded0ba5c';
const parentId = 'b62fefb4-2c01-4d0b-bf9e-379642163a39';

function directory(overrides: Partial<Directory> = {}): Directory {
    return {
        owner,
        id: childId,
        parent: uuidNil,
        name: 'Folder',
        visibility: DirectoryVisibility.PRIVATE,
        items: {},
        itemIds: [],
        createdAt: '2026-08-31T10:00:00.000Z',
        updatedAt: '2026-08-31T10:00:00.000Z',
        ...overrides,
    };
}

beforeEach(() => {
    vi.resetAllMocks();
});

describe('getAccessRole', () => {
    it('grants Viewer to an exact tier match', async () => {
        const role = await getAccessRole({
            owner,
            id: childId,
            username: viewer,
            directory: directory({ subscriptionTiers: [SubscriptionTier.Basic] }),
            subscriptionTier: SubscriptionTier.Basic,
        });

        expect(role).toBe(DirectoryAccessRole.Viewer);
    });

    it('does not grant Viewer to another paid tier', async () => {
        const role = await getAccessRole({
            owner,
            id: childId,
            username: viewer,
            directory: directory({ subscriptionTiers: [SubscriptionTier.Lecture] }),
            subscriptionTier: SubscriptionTier.GameReview,
        });

        expect(role).toBeUndefined();
    });

    it('inherits a tier match from the parent', async () => {
        vi.mocked(fetchDirectory).mockResolvedValue(
            directory({
                id: parentId,
                subscriptionTiers: [SubscriptionTier.Basic],
            }),
        );

        const role = await getAccessRole({
            owner,
            id: childId,
            username: viewer,
            directory: directory({ parent: parentId }),
            subscriptionTier: SubscriptionTier.Basic,
        });

        expect(role).toBe(DirectoryAccessRole.Viewer);
    });

    it('keeps a named role above tier Viewer access', async () => {
        const role = await getAccessRole({
            owner,
            id: childId,
            username: viewer,
            directory: directory({
                access: { [viewer]: DirectoryAccessRole.Admin },
                subscriptionTiers: [SubscriptionTier.Basic],
            }),
            subscriptionTier: SubscriptionTier.Basic,
        });

        expect(role).toBe(DirectoryAccessRole.Admin);
    });

    it('honors skipRecursion for parent tier access', async () => {
        const role = await getAccessRole({
            owner,
            id: childId,
            username: viewer,
            directory: directory({ parent: parentId }),
            skipRecursion: true,
            subscriptionTier: SubscriptionTier.Basic,
        });

        expect(role).toBeUndefined();
        expect(fetchDirectory).not.toHaveBeenCalled();
    });
});

describe('canViewDirectory', () => {
    it('allows public directories without a role', async () => {
        await expect(
            canViewDirectory({
                owner,
                id: childId,
                username: viewer,
                directory: directory({ visibility: DirectoryVisibility.PUBLIC }),
            }),
        ).resolves.toBe(true);
    });
});

describe('fetchSubscriptionTier', () => {
    it('uses subscription status when resolving the effective tier', async () => {
        vi.mocked(getUser).mockResolvedValue({
            subscriptionStatus: SubscriptionStatus.Canceled,
            subscriptionTier: SubscriptionTier.GameReview,
        } as User);

        await expect(fetchSubscriptionTier(viewer)).resolves.toBe(SubscriptionTier.Free);
    });
});
