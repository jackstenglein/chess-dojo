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
    /** The owner of the directory to check. */
    owner: string;
    /** The id of the directory to check. */
    id: string;
    /** The username of the user to check. */
    username: string;
    /** The initial directory to check. If undefined, it will be fetched. */
    directory?: Directory;
    /** Whether to skip recursion and only check access for the given directory. */
    skipRecursion?: boolean;
    /** The user's effective subscription tier. If undefined, tier-based access is not granted. */
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

/**
 * Returns true if the provided username has the provided access role (or higher) on the given directory.
 * Recursively checks parent directories until the given user is found.
 * @param params The directory and user to check, plus the minimum role required.
 * @returns True if the provided username has the provided access role or higher.
 */
export async function checkAccess(
    params: DirectoryAccessParams & { role: DirectoryAccessRole },
): Promise<boolean> {
    const currRole = await getAccessRole(params);
    return compareRoles(params.role, currRole);
}

/**
 * Gets the access role for the provided username on the given directory. Recursively checks parent
 * directories until the given user is found. If no named role is found, users whose subscription tier
 * is shared on the directory (or an ancestor) receive Viewer access.
 * @param params The directory and user to check.
 * @returns The access role of the provided username for the given directory.
 */
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
