import { BackendSourceError, buildPlayerOpeningTree } from '@/api/explorerApi';
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
    const [sources, setSources] = useState([DEFAULT_PLAYER_SOURCE]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);
    const [sourceErrors, setSourceErrors] = useState<BackendSourceError[]>([]);
    const abortControllerRef = useRef<AbortController>(undefined);
    const openingTree = useRef<OpeningTree>(undefined);
    const [filters, readonlyFilters] = useGameFilters(sources);

    const onLoad = useCallback(async () => {
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
        try {
            const apiSources = newSources.map((s) => ({
                type: s.type,
                username: s.username.trim().toLowerCase(),
            }));
            const response = await buildPlayerOpeningTree(apiSources);
            if (controller.signal.aborted) {
                return;
            }
            const tree = OpeningTree.fromBackendResponse(response.data);
            logger.debug?.('API returned tree: ', tree);
            openingTree.current = tree;
            setSourceErrors(response.data.sourceErrors ?? []);
        } catch (err) {
            if (controller.signal.aborted) {
                return;
            }
            logger.error?.('Failed to build player opening tree:', err);
            setError('Failed to load games. Please try again.');
        } finally {
            abortControllerRef.current = undefined;
            setIsLoading(false);
        }
    }, [sources, setSources]);

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
