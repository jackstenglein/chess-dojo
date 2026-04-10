import { useApi } from '@/api/Api';
import { IdentifiableCache, useIdentifiableCache } from '@/api/cache/Cache';
import { Request, useRequest } from '@/api/Request';
import {
    ALL_MY_UPLOADS_DIRECTORY_ID,
    Directory,
    DirectoryAccessRole,
    DirectoryItemTypes,
    DirectoryVisibility,
    HOME_DIRECTORY_ID,
    MY_GAMES_DIRECTORY_ID,
    SHARED_DIRECTORY_ID,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { AxiosError } from 'axios';
import { useTranslations } from 'next-intl';
import {
    createContext,
    Dispatch,
    ReactNode,
    SetStateAction,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { NIL as uuidNil } from 'uuid';

type DirectoryCacheTranslations = ReturnType<typeof useTranslations<'profile.directories.cache'>>;

export interface BreadcrumbItem {
    /** The name of the directory in the breadcrumb item. */
    name: string;

    /** The owner of the directory in the breadcrumb item. */
    owner: string;

    /** The id of the directory in the breadcrumb item. */
    id: string;

    /** The id of the parent directory in the breadcrumb item. */
    parent: string;
}

export interface BreadcrumbData {
    /** Maps a directory owner/id to its breadcrumb item. */
    breadcrumbs: Record<string, BreadcrumbItem>;

    /** Sets the entire breadcrumb data for the cache. */
    setBreadcrumbs: Dispatch<SetStateAction<Record<string, BreadcrumbItem>>>;

    /** Adds a single breadcrumb item for the given directory to the cache. */
    putBreadcrumb: (directory: Partial<Directory>) => void;
}

export interface AccessData {
    /** Maps a directory owner/id to the current user's access role. */
    accessRoles: Record<string, DirectoryAccessRole | undefined>;

    /** Puts the given directory into the cache, along with the current user's access role. */
    putWithAccess: (directory: Directory, access?: DirectoryAccessRole) => void;
}

export type DirectoryCacheContextType = IdentifiableCache<Directory> & BreadcrumbData & AccessData;

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DirectoryCacheContext = createContext<DirectoryCacheContextType>(null!);

export function useDirectoryCache() {
    return useContext(DirectoryCacheContext);
}

export function DirectoryCacheProvider({ children }: { children: ReactNode }) {
    const directories = useIdentifiableCache<Directory>((item) => `${item.owner}/${item.id}`);
    const [breadcrumbs, setBreadcrumbs] = useState<Record<string, BreadcrumbItem>>({});
    const [accessData, setAccessData] = useState<Record<string, DirectoryAccessRole | undefined>>(
        {},
    );

    const putBreadcrumb = useCallback(
        (directory: Partial<Directory>) => {
            if (directory.owner && directory.id && directory.name && directory.parent) {
                setBreadcrumbs((data) => {
                    return {
                        ...data,
                        [`${directory.owner}/${directory.id}`]: {
                            name: directory.name || '',
                            owner: directory.owner || '',
                            id: directory.id || '',
                            parent: directory.parent || '',
                        },
                    };
                });
            }
        },
        [setBreadcrumbs],
    );

    const put = directories.put;
    const putDirectory = useCallback(
        (directory: Directory) => {
            put(directory);
            putBreadcrumb(directory);
        },
        [put, putBreadcrumb],
    );

    const update = directories.update;
    const updateDirectory = useCallback(
        (directory: Partial<Directory>) => {
            update(directory);
            putBreadcrumb(directory);
        },
        [update, putBreadcrumb],
    );

    const putDirectoryWithAccess = useCallback(
        (directory: Directory, access?: DirectoryAccessRole) => {
            putDirectory(directory);
            setAccessData((data) => ({
                ...data,
                [`${directory.owner}/${directory.id}`]: access,
            }));
        },
        [putDirectory, setAccessData],
    );

    return (
        <DirectoryCacheContext.Provider
            value={{
                ...directories,
                put: putDirectory,
                update: updateDirectory,
                breadcrumbs,
                setBreadcrumbs,
                putBreadcrumb,
                accessRoles: accessData,
                putWithAccess: putDirectoryWithAccess,
            }}
        >
            {children}
        </DirectoryCacheContext.Provider>
    );
}

function getDefaultHomeDirectory(t: DirectoryCacheTranslations): Omit<Directory, 'owner'> {
    return {
        id: HOME_DIRECTORY_ID,
        parent: uuidNil,
        name: t('homeDirectoryName'),
        visibility: DirectoryVisibility.PUBLIC,
        createdAt: '',
        updatedAt: '',
        items: {
            [MY_GAMES_DIRECTORY_ID]: {
                id: MY_GAMES_DIRECTORY_ID,
                type: DirectoryItemTypes.DIRECTORY,
                metadata: {
                    name: t('myGamesName'),
                    description: t('myGamesDescription'),
                    visibility: DirectoryVisibility.PUBLIC,
                    createdAt: '',
                    updatedAt: '',
                },
            },
        },
        itemIds: [MY_GAMES_DIRECTORY_ID],
    };
}

function getDefaultSharedDirectory(t: DirectoryCacheTranslations): Omit<Directory, 'owner'> {
    return {
        id: SHARED_DIRECTORY_ID,
        parent: uuidNil,
        name: t('sharedDirectoryName'),
        visibility: DirectoryVisibility.PRIVATE,
        createdAt: '',
        updatedAt: '',
        items: {},
        itemIds: [],
    };
}

export interface UseDirectoryResponse {
    directory?: Directory;
    accessRole?: DirectoryAccessRole;
    request: Request;
    putDirectory: (directory: Directory) => void;
    updateDirectory: (directory: Partial<Directory>) => void;
}

export function useDirectory(owner: string, id: string): UseDirectoryResponse {
    const t = useTranslations('profile.directories.cache');
    const api = useApi();
    const cache = useDirectoryCache();

    const compoundKey = `${owner}/${id}`;
    const directory = useMemo(() => cache.get(compoundKey), [cache, compoundKey]);

    const isFetched = cache.isFetched;
    const reset = cache.request.reset;
    const success = cache.request.onSuccess;
    useEffect(() => {
        if (!isFetched(compoundKey)) {
            reset();
        } else {
            success();
        }
    }, [isFetched, reset, success, compoundKey]);

    useEffect(() => {
        if (!cache.isFetched(compoundKey) && !cache.request.isSent()) {
            cache.request.onStart();
            api.getDirectory(owner, id)
                .then((resp) => {
                    cache.markFetched(compoundKey);
                    cache.putWithAccess(resp.data.directory, resp.data.accessRole);
                    cache.request.onSuccess();
                })
                .catch((err: AxiosError) => {
                    if (err.response?.status === 404) {
                        cache.markFetched(compoundKey);
                        cache.request.onSuccess();
                        if (id === HOME_DIRECTORY_ID) {
                            cache.put({ ...getDefaultHomeDirectory(t), owner });
                        }
                        if (id === SHARED_DIRECTORY_ID) {
                            cache.put({ ...getDefaultSharedDirectory(t), owner });
                        }
                    } else {
                        cache.request.onFailure(err);
                    }
                });
        }
    }, [api, cache, compoundKey, owner, id, t]);

    return {
        directory,
        accessRole: cache.accessRoles[`${owner}/${id}`],
        request: cache.request,
        putDirectory: cache.put,
        updateDirectory: cache.update,
    };
}

export function useBreadcrumbs(owner: string, id: string, sharedOwner?: string) {
    const t = useTranslations('profile.directories.cache');
    const cache = useDirectoryCache();
    const api = useApi();
    const request = useRequest();

    let compoundKey = `${owner}/${id}`;

    const result: BreadcrumbItem[] = [];
    while (cache.breadcrumbs[compoundKey]) {
        const item = cache.breadcrumbs[compoundKey];
        result.push(item);
        if (item.parent === SHARED_DIRECTORY_ID && sharedOwner) {
            compoundKey = `${sharedOwner}/${item.parent}`;
        } else {
            compoundKey = `${owner}/${item.parent}`;
        }
    }

    if (id === ALL_MY_UPLOADS_DIRECTORY_ID && !result.length) {
        result.push({
            name: t('allUploadsBreadcrumb'),
            owner,
            id: ALL_MY_UPLOADS_DIRECTORY_ID,
            parent: uuidNil,
        });
    }

    const setBreadcrumbs = cache.setBreadcrumbs;
    useEffect(() => {
        if (id === uuidNil || id === ALL_MY_UPLOADS_DIRECTORY_ID || request.isSent()) {
            return;
        }

        request.onStart();
        api.listBreadcrumbs({
            owner,
            id,
            shared: Boolean(sharedOwner && sharedOwner !== owner),
        })
            .then((resp) => {
                request.onSuccess();
                setBreadcrumbs((data) => ({ ...data, ...resp.data }));
            })
            .catch((err) => {
                request.onFailure(err);
            });
    }, [id, request, api, owner, setBreadcrumbs, sharedOwner]);

    return result.reverse();
}
