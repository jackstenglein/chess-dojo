import { BackendSourceError, buildPlayerOpeningTree, Cursor } from '@/api/explorerApi';
import { useAuth } from '@/auth/Auth';
import { logger } from '@/logging/logger';
import {
    createContext,
    Dispatch,
    ReactNode,
    RefObject,
    SetStateAction,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';
import { EditableGameFilters, useGameFilters } from './Filters';
import { OpeningTree } from './OpeningTree';
import { DEFAULT_PLAYER_SOURCE, GameFilters, PlayerSource } from './PlayerSource';

export interface PlayerOpeningTreeContextType {
    sources: PlayerSource[];
    setSources: Dispatch<SetStateAction<PlayerSource[]>>;
    isLoading: boolean;
    gameCount: number;
    onLoad: () => Promise<void>;
    onCancel: () => void;
    onClear: () => void;
    openingTree: RefObject<OpeningTree | undefined | null>;
    filters: EditableGameFilters;
    readonlyFilters: GameFilters;
    error: string | undefined;
    sourceErrors: BackendSourceError[];
}

const PlayerOpeningTreeContext = createContext<PlayerOpeningTreeContextType | undefined>(undefined);

export function usePlayerOpeningTree(): PlayerOpeningTreeContextType {
    const context = useContext(PlayerOpeningTreeContext);
    if (!context) {
        throw new Error('usePlayerOpeningTree called from outside of PlayerOpeningTreeProvider');
    }
    return context;
}

export function PlayerOpeningTreeProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const idToken = user?.cognitoUser?.tokens?.idToken?.toString() ?? '';
    const [sources, setSources] = useState([DEFAULT_PLAYER_SOURCE]);
    const [isLoading, setIsLoading] = useState(false);
    const [gameCount, setGameCount] = useState(0);
    const [error, setError] = useState<string | undefined>(undefined);
    const [sourceErrors, setSourceErrors] = useState<BackendSourceError[]>([]);
    const abortControllerRef = useRef<AbortController>(undefined);
    const openingTree = useRef<OpeningTree>(undefined);
    const [filters, readonlyFilters] = useGameFilters(sources);

    const onLoad = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const newSources: PlayerSource[] = [];
        const seenSources = new Set<string>();
        for (const source of sources) {
            const sourceKey = `${source.type}_${source.username.trim().toLowerCase()}`;
            if (source.username.trim() === '') {
                newSources.push({ ...source, hasError: true });
            } else if (seenSources.has(sourceKey)) {
                newSources.push({ ...source, hasError: true, error: 'Duplicate source' });
            } else {
                seenSources.add(sourceKey);
                newSources.push({ ...source, hasError: undefined, error: undefined });
            }
        }

        setSources(newSources);
        if (newSources.some((s) => s.hasError)) {
            return;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setError(undefined);
        setSourceErrors([]);
        setGameCount(0);
        try {
            const apiSources = newSources.map((s) => ({
                type: s.type,
                username: s.username.trim().toLowerCase(),
            }));

            const accumulatedTree = new OpeningTree();
            let cursor: Cursor | undefined;

            const since = filters.dateRange[0]?.toUTC().toISO() ?? undefined;
            const until = filters.dateRange[1]?.endOf('day').toUTC().toISO() ?? undefined;

            do {
                const response = await buildPlayerOpeningTree(
                    idToken,
                    apiSources,
                    controller.signal,
                    cursor,
                    since,
                    until,
                );
                if (controller.signal.aborted) {
                    return;
                }

                const pageTree = OpeningTree.fromBackendResponse(response.data);
                accumulatedTree.merge(pageTree);
                logger.debug?.('Merged page, total games:', accumulatedTree.getGameCount());
                setGameCount(accumulatedTree.getGameCount());
                setSourceErrors(response.data.sourceErrors ?? []);

                cursor = response.data.truncated ? response.data.cursor : undefined;
            } while (cursor);

            openingTree.current = accumulatedTree;
        } catch (err) {
            if (controller.signal.aborted) {
                return;
            }
            logger.error?.('Failed to build player opening tree:', err);
            setError('Failed to load games. Please try again.');
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = undefined;
                setIsLoading(false);
            }
        }
    }, [idToken, sources, setSources, filters.dateRange]);

    const onCancel = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = undefined;
        setIsLoading(false);
    }, []);

    const onClear = () => {
        openingTree.current = undefined;
        setError(undefined);
        setSourceErrors([]);
    };

    return (
        <PlayerOpeningTreeContext.Provider
            value={{
                sources,
                setSources,
                isLoading,
                gameCount,
                onLoad,
                onCancel,
                onClear,
                openingTree,
                filters,
                readonlyFilters,
                error,
                sourceErrors,
            }}
        >
            {children}
        </PlayerOpeningTreeContext.Provider>
    );
}
