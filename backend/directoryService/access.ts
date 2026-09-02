import {
    compareRoles,
    Directory,
    DirectoryAccessRole,
    DirectoryVisibility,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { NIL as uuidNil } from 'uuid';
import { getUser } from './database';
import { fetchDirectory } from './get';

export interface DirectoryAccessParams {
    owner: string;
    id: string;
    username: string;
    directory?: Directory;
    skipRecursion?: boolean;
    subscriptionTier?: SubscriptionTier;
}

/** Returns the effective subscription tier for the given username. */
export async function fetchSubscriptionTier(username: string): Promise<SubscriptionTier> {
    return getSubscriptionTier(await getUser(username));
}

/** Returns true when the directory is public or the user has Viewer access. */
export async function canViewDirectory(params: DirectoryAccessParams): Promise<boolean> {
    const directory = params.directory ?? (await fetchDirectory(params.owner, params.id));
    if (!directory) {
        return false;
    }
    if (directory.visibility === DirectoryVisibility.PUBLIC) {
        return true;
    }
    return checkAccess({
        ...params,
        directory,
        role: DirectoryAccessRole.Viewer,
    });
}

/** Returns true if the user has the provided access role or higher. */
export async function checkAccess(
    params: DirectoryAccessParams & { role: DirectoryAccessRole },
): Promise<boolean> {
    const currRole = await getAccessRole(params);
    return compareRoles(params.role, currRole);
}

/** Gets the user's direct, inherited, or tier-based role for a directory. */
export async function getAccessRole({
    owner,
    id,
    username,
    directory,
    skipRecursion,
    subscriptionTier,
}: DirectoryAccessParams): Promise<DirectoryAccessRole | undefined> {
    if (username === owner) {
        return DirectoryAccessRole.Owner;
    }

    directory = directory ?? (await fetchDirectory(owner, id));
    if (!directory) {
        return undefined;
    }

    if (directory.access?.[username] !== undefined) {
        return directory.access[username];
    }

    if (!skipRecursion && directory.parent !== uuidNil) {
        const inheritedRole = await getAccessRole({
            owner,
            id: directory.parent,
            username,
            subscriptionTier,
        });
        if (inheritedRole !== undefined) {
            return inheritedRole;
        }
    }

    if (
        subscriptionTier &&
        directory.subscriptionTiers?.some((tier) => tier === subscriptionTier)
    ) {
        return DirectoryAccessRole.Viewer;
    }

    return undefined;
}
