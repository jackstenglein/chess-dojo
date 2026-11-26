import { useReconcile } from '@/board/Board';
import { EventType } from '@jackstenglein/chess';
import { Button, Snackbar } from '@mui/material';
import { useTranslations } from 'next-intl';
import {
    createContext,
    ReactNode,
    RefObject,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useChess } from './PgnBoard';
import { restorePgn } from './restorePgn';

interface DeletedMoves {
    /** The number of moves that were deleted. */
    moves: number;
    /** The PGN of the game immediately before the delete. */
    pgn: string;
}

export interface UndoDeleteContextType {
    /** Shows the undo snackbar for the given delete. */
    onMovesDeleted: (deleted: DeletedMoves) => void;

    /** Persists a PGN restored by undo. Set by StatusIcon; null on boards without autosave. */
    savePgnRef: RefObject<((pgn: string) => void) | null>;
}

const UndoDeleteContext = createContext<UndoDeleteContextType>({
    onMovesDeleted: () => undefined,
    savePgnRef: { current: null },
});

export function useUndoDelete() {
    return useContext(UndoDeleteContext);
}

/**
 * Renders a snackbar allowing the user to undo the most recent move deletion.
 * Must be rendered inside a ChessContext provider.
 */
export function UndoDeleteProvider({ children }: { children: ReactNode }) {
    const { chess } = useChess();
    const reconcile = useReconcile();
    const t = useTranslations('analysisBoard.underboard');
    const [open, setOpen] = useState(false);
    const [deleted, setDeleted] = useState<DeletedMoves & { key: number }>();
    const savePgnRef = useRef<((pgn: string) => void) | null>(null);

    const onMovesDeleted = useCallback((d: DeletedMoves) => {
        setDeleted((prev) => ({ ...d, key: (prev?.key ?? 0) + 1 }));
        setOpen(true);
    }, []);

    const value = useMemo(() => ({ onMovesDeleted, savePgnRef }), [onMovesDeleted]);

    useEffect(() => {
        if (!open || !chess) {
            return;
        }
        // Restoring the snapshot would wipe any later edit, so the next edit ends the undo window.
        const observer = {
            types: Object.values(EventType).filter(
                (type) =>
                    type !== EventType.Initialized &&
                    type !== EventType.LegalMove &&
                    type !== EventType.IllegalMove,
            ),
            handler: () => setOpen(false),
        };
        chess.addObserver(observer);
        return () => chess.removeObserver(observer);
    }, [open, chess]);

    const onUndo = () => {
        setOpen(false);
        if (!chess || !deleted) {
            return;
        }
        // Save first so StatusIcon treats the Initialized event from loadPgn as an
        // unsaved restore instead of a freshly loaded, already-saved game.
        savePgnRef.current?.(deleted.pgn);
        restorePgn(chess, deleted.pgn);
        reconcile();
    };

    return (
        <UndoDeleteContext.Provider value={value}>
            {children}
            <Snackbar
                // A new key per deletion restarts the auto-hide timer.
                key={deleted?.key}
                data-testid='undo-delete-snackbar'
                open={open}
                autoHideDuration={10000}
                onClose={(_, reason) => {
                    if (reason !== 'clickaway') {
                        setOpen(false);
                    }
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={deleted ? t('deletedMoves', { count: deleted.moves }) : undefined}
                action={
                    <Button
                        onClick={onUndo}
                        color='secondary'
                        size='small'
                        sx={{ fontWeight: 'bold' }}
                    >
                        {t('undo')}
                    </Button>
                }
            />
        </UndoDeleteContext.Provider>
    );
}
