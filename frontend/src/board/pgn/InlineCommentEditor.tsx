import { Chess, CommentType, EventType, Move } from '@jackstenglein/chess';
import { Box, InputBase } from '@mui/material';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { BlockBoardKeyboardShortcuts, useChess } from './PgnBoard';
import { getEditorComment, setEditorComment } from './boardTools/underboard/commentEditing';

interface Editing {
    move: Move | null;
    type: CommentType;
}
const Context = createContext<{
    editing: Editing | null;
    start: (type: CommentType) => void;
    stop: () => void;
}>({ editing: null, start: () => undefined, stop: () => undefined });
export const useInlineComment = () => useContext(Context);

export function commentTarget(chess: Chess, editing: Editing) {
    if (editing.move && editing.type === CommentType.Before && chess.isInMainline(editing.move)) {
        return { move: editing.move.previous ?? null, type: CommentType.After };
    }
    return editing;
}

export function InlineCommentProvider({ children }: { children: ReactNode }) {
    const { chess } = useChess();
    const [editing, setEditing] = useState<Editing | null>(null);
    useEffect(() => {
        if (!chess) return;
        const observer = {
            types: [
                EventType.LegalMove,
                EventType.Initialized,
                EventType.DeleteMove,
                EventType.DeleteBeforeMove,
            ],
            handler: () => setEditing(null),
        };
        chess.addObserver(observer);
        return () => chess.removeObserver(observer);
    }, [chess]);
    return (
        <Context.Provider
            value={{
                editing,
                start: (type) =>
                    setEditing((current) =>
                        current?.move === chess?.currentMove() && current?.type === type
                            ? null
                            : { move: chess?.currentMove() ?? null, type },
                    ),
                stop: () => setEditing(null),
            }}
        >
            {children}
        </Context.Provider>
    );
}

export function InlineCommentInput() {
    const { chess } = useChess();
    const { editing, stop } = useInlineComment();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [text, setText] = useState(() =>
        chess && editing ? getEditorComment(chess, editing.type) : '',
    );
    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(
            inputRef.current.value.length,
            inputRef.current.value.length,
        );
        inputRef.current?.scrollIntoView({ block: 'nearest' });
    }, []);
    if (!chess || !editing) return null;
    return (
        <Box className={BlockBoardKeyboardShortcuts} sx={{ width: 1, minWidth: 0 }}>
            <InputBase
                multiline
                fullWidth
                inputRef={inputRef}
                value={text}
                placeholder='Type comment…'
                inputProps={{
                    'aria-label':
                        editing.type === CommentType.Before
                            ? 'Text before move'
                            : 'Text after move',
                }}
                onChange={(event) => {
                    setText(event.target.value);
                    setEditorComment(chess, event.target.value, editing.type);
                }}
                onKeyDown={(event) => {
                    event.stopPropagation();
                    if (
                        event.key === 'Escape' ||
                        (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing)
                    ) {
                        event.preventDefault();
                        stop();
                    }
                }}
                sx={{
                    px: 1,
                    py: 0.5,
                    fontSize: 'inherit',
                    color: 'text.primary',
                    backgroundColor: 'action.selected',
                }}
            />
        </Box>
    );
}
