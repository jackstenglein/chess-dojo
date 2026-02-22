import { Chess, Move } from '@jackstenglein/chess';
import { Help } from '@mui/icons-material';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { BoardApi } from '../../../../Board';
import { BlockBoardKeyboardShortcuts } from '../../../PgnBoard';
import { UnderboardApi } from '../Underboard';
import { DefaultUnderboardTab } from '../underboardTabs';
import { KeyBinding, ShortcutAction, ShortcutBindings } from './ShortcutAction';

/**
 * Returns a user-facing display string for the given ShortcutAction.
 * @param action The action to display.
 * @returns The display string for the given ShortcutAction.
 */
function displayShortcutAction(action: ShortcutAction): string {
    switch (action) {
        case ShortcutAction.FirstMove:
            return 'First Move';
        case ShortcutAction.PreviousMove:
            return 'Previous Move';
        case ShortcutAction.NextMove:
            return 'Next Move';
        case ShortcutAction.LastMove:
            return 'Last Move';
        case ShortcutAction.ToggleOrientation:
            return 'Flip Board';
        case ShortcutAction.FirstVariation:
            return 'First Variation';
        case ShortcutAction.FirstMoveVariation:
            return 'First Move in Variation';
        case ShortcutAction.LastMoveVariation:
            return 'Last Move in Variation';
        case ShortcutAction.OpenFiles:
            return 'Open Files';
        case ShortcutAction.OpenTags:
            return 'Open Tags';
        case ShortcutAction.OpenEditor:
            return 'Open Editor';
        case ShortcutAction.OpenComments:
            return 'Open Comments';
        case ShortcutAction.OpenDatabase:
            return 'Open Position Database';
        case ShortcutAction.OpenClocks:
            return 'Open Clock Usage';
        case ShortcutAction.OpenSettings:
            return 'Open Settings';
        case ShortcutAction.OpenShare:
            return 'Open Share';
        case ShortcutAction.FocusMainTextField:
            return 'Focus Main Text Field';
        case ShortcutAction.FocusCommentTextField:
            return 'Focus Comment Text Field';
        case ShortcutAction.UnfocusTextField:
            return 'Unfocus Text Fields';
        case ShortcutAction.InsertNullMove:
            return 'Insert Null Move';
        case ShortcutAction.InsertEngineMove:
            return 'Insert Top Engine Move';
        case ShortcutAction.NextPuzzle:
            return 'Next Puzzle';
        case ShortcutAction.ViewKey:
            return 'View Keys Dialog';
    }
}

/**
 * Returns a user-facing description for the given ShortcutAction.
 * @param action The action to get a description for.
 * @returns The description for the given ShortcutAction.
 */
function shortcutActionDescription(action: ShortcutAction): string {
    switch (action) {
        case ShortcutAction.FirstMove:
            return 'Go to the starting position of the game.';
        case ShortcutAction.PreviousMove:
            return 'Go to the previous move.';
        case ShortcutAction.NextMove:
            return 'Go to the next move.';
        case ShortcutAction.LastMove:
            return 'Go to the last move of the game.';
        case ShortcutAction.ToggleOrientation:
            return 'Toggle the orientation of the board.';
        case ShortcutAction.FirstVariation:
            return 'Go to the first variation of the next move, if it has a variation. If it does not have a variation, go to the next move.';
        case ShortcutAction.FirstMoveVariation:
            return 'Go to the first move of the current variation.';
        case ShortcutAction.LastMoveVariation:
            return 'Go to the last move of the current variation.';
        case ShortcutAction.OpenFiles:
            return 'Open the Files tab.';
        case ShortcutAction.OpenTags:
            return 'Open the Tags tab.';
        case ShortcutAction.OpenEditor:
            return 'Open the Editor tab, if present.';
        case ShortcutAction.OpenComments:
            return 'Open the Comments tab.';
        case ShortcutAction.OpenDatabase:
            return 'Open the Position Database tab.';
        case ShortcutAction.OpenClocks:
            return 'Open the Clock Usage tab.';
        case ShortcutAction.OpenSettings:
            return 'Open the Settings tab.';
        case ShortcutAction.OpenShare:
            return 'Open the Share tab.';
        case ShortcutAction.FocusMainTextField:
            return 'Open the Editor tab, if present, and focus the text field. If the Editor tab is not present, open the Comments tab and focus the text field.';
        case ShortcutAction.FocusCommentTextField:
            return 'Open the Comments tab and focus the text field.';
        case ShortcutAction.UnfocusTextField:
            return 'Unfocuses all text fields, allowing the usage of keyboard shortcuts and board controls.';
        case ShortcutAction.InsertNullMove:
            return 'Inserts a null move into the PGN, passing the turn to the other side without changing the position. Null moves cannot be added when in check or immediately after another null move.';
        case ShortcutAction.InsertEngineMove:
            return 'Inserts the top engine move into the game (note: the engine must be running).';
        case ShortcutAction.NextPuzzle:
            return 'Goes to the next puzzle (has no effect outside of puzzles).';
        case ShortcutAction.ViewKey:
            return 'Opens shortcut keys dialog';
    }
}

/**
 * Returns a user-facing display name for the given key.
 * @param key The key to display.
 * @returns The display string for the given key, or undefined if key is undefined.
 */
function displayKey(key?: string): string | undefined {
    if (key === ' ') {
        return 'Space';
    }
    return key;
}

/** The valid modifier keys. */
export const modifierKeys = ['Shift', 'Control', 'Alt'];

/** Options passed to ShortcutHandler functions. Not all handlers use all options. */
interface ShortcutHandlerOptions {
    /**
     * A function to set the move for the variation dialog. If passed to handleNextMove
     * and the next move has variations, this function will be called with the move
     * instead of going to that move.
     */
    setVariationDialogMove?: (move: Move) => void;

    /**
     * A function that is takes care of opening the entire view key dialog
     */
    setViewKeysDialog?: (view: boolean) => void;

    /**
     * The API for imperatively interacting with the underboard.
     */
    underboardApi?: UnderboardApi | null;

    /**
     * Whether to allow showing the editor tab in the underboard.
     */
    showEditor?: boolean;

    /**
     * A function which toggles the orientation of the board.
     */
    toggleOrientation?: () => void;

    /**
     * Whether to insert the next engine's move when hitting the keybind.
     */
    addEngineMove?: () => void;
}

interface ShortcutHandlerProps {
    /** The Chess instance to update. */
    chess?: Chess;

    /** The Board instance to update. */
    board?: BoardApi;

    /** The Chess/Board reconcile function. */
    reconcile?: () => void;

    /** The shortcut handler options. */
    opts?: ShortcutHandlerOptions;
}

/** A function which handles a keyboard shortcut. */
type ShortcutHandler = (props: ShortcutHandlerProps) => void;

/**
 * Goes to the first move in the given Chess instance.
 * @param chess The Chess instance to update.
 * @param reconcile The Chess/Board reconcile function.
 */
function handleFirstMove({ chess, reconcile }: ShortcutHandlerProps) {
    chess?.seek(null);
    reconcile?.();
}

/**
 * Goes to the previous move in the given Chess instance.
 * @param chess The Chess instance to update.
 * @param reconcile The Chess/Board reconcile function.
 */
function handlePreviousMove({ chess, reconcile }: ShortcutHandlerProps) {
    chess?.seek(chess.previousMove());
    reconcile?.();
}

/**
 * Goes to the next move, if one exists, in the given Chess instance or set the variation
 * dialog move if opts.setVariationDialog move is provided.
 * @param chess The Chess instance to update.
 * @param reconcile The Chess/Board reconcile function.
 * @param opts The options to use.
 */
function handleNextMove({ chess, reconcile, opts }: ShortcutHandlerProps) {
    const nextMove = chess?.nextMove();
    if (!nextMove) {
        return;
    }

    if (opts?.setVariationDialogMove && nextMove.variations && nextMove.variations.length > 0) {
        opts.setVariationDialogMove(nextMove);
    } else {
        chess?.seek(nextMove);
        reconcile?.();
    }
}

/**
 * Goes to the last move in the given Chess instance.
 * @param chess The Chess instance to update.
 * @param reconcile The Chess/Board reconcile function.
 */
function handleLastMove({ chess, reconcile }: ShortcutHandlerProps) {
    chess?.seek(chess.lastMove());
    reconcile?.();
}

/**
 * Handles toggling the orientation of the board. This function is a no-op if opts
 * does not contain a valid toggleOrientation function.
 * @param opts The options to use.
 */
function handleToggleOrientation({ opts }: ShortcutHandlerProps) {
    opts?.toggleOrientation?.();
}

/**
 * Goes to the first variation of the next move, if one exists. Otherwise goes to the next move.
 * @param chess The Chess instance to update.
 * @param reconcile The Chess/Board reconcile function.
 */
function handleFirstVariation({ chess, reconcile }: ShortcutHandlerProps) {
    let nextMove = chess?.nextMove();
    if (nextMove?.variations.length) {
        nextMove = nextMove.variations[0][0];
    }
    if (nextMove) {
        chess?.seek(nextMove);
        reconcile?.();
    }
}

/**
 * Goes to the first move of the current variation.
 * @param chess The Chess instance to update.
 * @param reconcile The Chess/Board reconcile function.
 */
function handleFirstMoveVariation({ chess, reconcile }: ShortcutHandlerProps) {
    const move = chess?.currentMove();
    if (move) {
        chess?.seek(move.variation[0]);
        reconcile?.();
    }
}

/**
 * Goes to the last move of the current variation.
 * @param chess The Chess instance to update.
 * @param reconcile The Chess/Board reconcile function.
 */
function handleLastMoveVariation({ chess, reconcile }: ShortcutHandlerProps) {
    const move = chess?.currentMove();
    if (move) {
        chess?.seek(move.variation[move.variation.length - 1]);
        reconcile?.();
    }
}

/**
 * Returns a shortcut handler which opens the provided underboard tab. The handler
 * is a no-op if opts does not contain a valid underboardApi object.
 * @param tab The tab to open.
 * @returns A shortcut handler which opens the given tab.
 */
function handleOpenTab(tab: DefaultUnderboardTab): ShortcutHandler {
    return ({ opts }: ShortcutHandlerProps) => {
        opts?.underboardApi?.switchTab(tab);
    };
}

/**
 * Handles focusing the main text field in the underboard. The main text field is
 * the Editor tab text field if the current user owns the current game and the
 * Comment tab text field otherwise. This function is a no-op if opts
 * does not contain a valid underboardApi object.
 * @param opts The options to use.
 */
function handleFocusMainTextField({ opts }: ShortcutHandlerProps) {
    opts?.underboardApi?.focusEditor();
}

/**
 * Handles focusing the comment tab text field in the underboard. This function is a
 * no-op if opts does not contain a valid underboardApi object.
 * @param opts The options to use.
 */
function handleFocusCommentTextField({ opts }: ShortcutHandlerProps) {
    opts?.underboardApi?.focusCommenter();
}

/**
 * Handles unfocusing the currently-active text field.
 */
function handleUnfocusTextField() {
    const activeElement = document.activeElement;
    if (typeof (activeElement as HTMLElement).blur === 'function') {
        (activeElement as HTMLElement).blur();
    }
}

/**
 * Handles inserting a null move. If the current move is check or the game is over,
 * this function is a no-op.
 * @param chess The chess instance to update.
 */
function handleInsertNullMove({ chess, reconcile }: ShortcutHandlerProps) {
    if (
        chess?.disableNullMoves ||
        chess?.isCheck() ||
        chess?.isGameOver() ||
        chess?.currentMove()?.san === 'Z0'
    ) {
        return;
    }
    chess?.move('Z0');
    reconcile?.();
}

/** Handles inserting the top engine move.
 */
function handleInsertEngineMove({ opts }: ShortcutHandlerProps) {
    opts?.addEngineMove?.();
}
/**
 * Hands opening the view keys dialog
 */
function handleViewKeyAction({ opts }: ShortcutHandlerProps) {
    opts?.setViewKeysDialog?.(true);
}

/**
 * Maps ShortcutActions to their handler functions. Not all ShortcutActions are included.
 */
export const keyboardShortcutHandlers: Record<ShortcutAction, ShortcutHandler> = {
    [ShortcutAction.FirstMove]: handleFirstMove,
    [ShortcutAction.PreviousMove]: handlePreviousMove,
    [ShortcutAction.NextMove]: handleNextMove,
    [ShortcutAction.LastMove]: handleLastMove,
    [ShortcutAction.ToggleOrientation]: handleToggleOrientation,
    [ShortcutAction.FirstVariation]: handleFirstVariation,
    [ShortcutAction.FirstMoveVariation]: handleFirstMoveVariation,
    [ShortcutAction.LastMoveVariation]: handleLastMoveVariation,
    [ShortcutAction.OpenFiles]: handleOpenTab(DefaultUnderboardTab.Directories),
    [ShortcutAction.OpenTags]: handleOpenTab(DefaultUnderboardTab.Tags),
    [ShortcutAction.OpenEditor]: handleOpenTab(DefaultUnderboardTab.Editor),
    [ShortcutAction.OpenComments]: handleOpenTab(DefaultUnderboardTab.Comments),
    [ShortcutAction.OpenDatabase]: handleOpenTab(DefaultUnderboardTab.Explorer),
    [ShortcutAction.OpenClocks]: handleOpenTab(DefaultUnderboardTab.Clocks),
    [ShortcutAction.OpenSettings]: handleOpenTab(DefaultUnderboardTab.Settings),
    [ShortcutAction.OpenShare]: handleOpenTab(DefaultUnderboardTab.Share),
    [ShortcutAction.FocusMainTextField]: handleFocusMainTextField,
    [ShortcutAction.FocusCommentTextField]: handleFocusCommentTextField,
    [ShortcutAction.UnfocusTextField]: handleUnfocusTextField,
    [ShortcutAction.InsertNullMove]: handleInsertNullMove,
    [ShortcutAction.InsertEngineMove]: handleInsertEngineMove,
    [ShortcutAction.ViewKey]: handleViewKeyAction,
    [ShortcutAction.NextPuzzle]: () => null, // This action is a special case handled by the CheckmatePuzzlePage component.
};

/**
 * Matches an event key and modifiers to keyBindings, returning the matched action.
 * @param keyBindings The key bindings to match.
 * @param key The key to match.
 * @param modifiers The active modifiers to use when matching.
 * @returns The matched ShortcutAction or undefined if none match.
 */
export function matchAction(
    keyBindings: Record<ShortcutAction, KeyBinding>,
    key: string,
    modifiers: Record<string, boolean>,
): ShortcutAction | undefined {
    let matchedAction: ShortcutAction | undefined = undefined;
    const noModifiers = Object.values(modifiers).every((v) => !v);
    key = key.toLowerCase();

    for (const action of Object.values(ShortcutAction)) {
        const binding = keyBindings[action] || ShortcutBindings.default[action];

        if (binding.key.toLowerCase() === key) {
            if (
                (!binding.modifier && noModifiers) ||
                (binding.modifier && modifiers[binding.modifier])
            ) {
                // This is the exact shortcut, so we can stop looking
                matchedAction = action;
                break;
            }

            if (binding.modifier) {
                // The modifier is not used, so this shortcut doesn't actually match
                // and we must keep looking
                continue;
            }

            // This action matches but a modifier is in place, so there may be another
            // action that matches both the key and modifier, so we must keep looking
            matchedAction = action;
        }
    }
    return matchedAction;
}

export interface KeyboardShortcutsProps {
    /** The actions to display. Defaults to all actions. */
    actions?: ShortcutAction[];
    /** If true, the button to reset all to defaults is hidden. */
    hideReset?: boolean;
}

/**
 * @returns A component for viewing and editing keyboard shortcuts.
 */
const KeyboardShortcuts = ({
    actions = Object.values(ShortcutAction),
    hideReset,
}: KeyboardShortcutsProps) => {
    const [keyBindings, setKeyBindings] = useLocalStorage(
        ShortcutBindings.key,
        ShortcutBindings.default,
    );

    const [editAction, setEditAction] = useState<ShortcutAction>();
    const [editKey, setEditKey] = useState<string>();

    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!editAction) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (modifierKeys.includes(event.key)) {
                return;
            }
            setEditKey(event.code.replace('Key', ''));
        },
        [editAction, setEditKey],
    );

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onKeyDown]);

    const onChangeModifier = (action: ShortcutAction, modifier: string) => {
        setKeyBindings({
            ...keyBindings,
            [action]: {
                key: (keyBindings[action] || ShortcutBindings.default[action]).key,
                modifier,
            },
        });
    };

    const onOpenEditor = (action: ShortcutAction) => {
        setEditAction(action);
        setEditKey((keyBindings[action] || ShortcutBindings.default[action]).key);
    };

    const onCloseEditor = () => {
        setEditAction(undefined);
        setEditKey(undefined);
    };

    const onSaveEditor = () => {
        if (editAction) {
            setKeyBindings({
                ...keyBindings,
                [editAction]: {
                    key: editKey || '',
                    modifier: (keyBindings[editAction] || ShortcutBindings.default[editAction])
                        .modifier,
                },
            });
        }
        onCloseEditor();
    };

    const onRemoveKey = () => {
        if (editAction) {
            setKeyBindings({
                ...keyBindings,
                [editAction]: {
                    key: '',
                    modifier: (keyBindings[editAction] || ShortcutBindings.default[editAction])
                        .modifier,
                },
            });
        }
        onCloseEditor();
    };

    const onReset = () => {
        setKeyBindings(ShortcutBindings.default);
    };

    return (
        <Stack>
            <Typography variant='h6'>Keyboard Shortcuts</Typography>
            <Typography variant='subtitle2' color='text.secondary'>
                Keyboard shortcuts are disabled while editing text fields (comments, clock times,
                tags, etc).
            </Typography>

            <Grid container rowGap={2} columnSpacing={2} alignItems='center' mt={1.5}>
                <Grid sx={{ borderBottom: 1, borderColor: 'divider' }} size={5}>
                    <Typography>Action</Typography>
                </Grid>
                <Grid sx={{ borderBottom: 1, borderColor: 'divider' }} size={3.5}>
                    <Typography textAlign='center'>Modifier</Typography>
                </Grid>
                <Grid sx={{ borderBottom: 1, borderColor: 'divider' }} size={3.5}>
                    <Typography textAlign='center'>Key</Typography>
                </Grid>
                {actions.map((a) => {
                    const binding = keyBindings[a] || ShortcutBindings.default[a];
                    return (
                        <Fragment key={a}>
                            <Grid size={5}>
                                <Stack direction='row' spacing={1} alignItems='center'>
                                    <Typography variant='body2'>
                                        {displayShortcutAction(a)}
                                    </Typography>

                                    <Tooltip title={shortcutActionDescription(a)}>
                                        <Help sx={{ color: 'text.secondary' }} />
                                    </Tooltip>
                                </Stack>
                            </Grid>
                            <Grid size={3.5}>
                                <TextField
                                    size='small'
                                    fullWidth
                                    select
                                    value={binding.modifier}
                                    onChange={(e) => onChangeModifier(a, e.target.value)}
                                    SelectProps={{
                                        displayEmpty: true,
                                    }}
                                >
                                    <MenuItem value=''>
                                        <em>None</em>
                                    </MenuItem>
                                    <MenuItem value='Shift'>Shift</MenuItem>
                                    <MenuItem value='Control'>Control</MenuItem>
                                    <MenuItem value='Alt'>Alt (Windows) / Option (Mac)</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid size={3.5}>
                                <Button
                                    variant='contained'
                                    sx={{
                                        textTransform: 'none',
                                        width: 1,
                                        height: '36.5px',
                                    }}
                                    onClick={() => onOpenEditor(a)}
                                >
                                    {displayKey(binding.key)}
                                </Button>
                            </Grid>
                        </Fragment>
                    );
                })}
                {!hideReset && (
                    <Grid size={12}>
                        <Button color='error' onClick={onReset} sx={{ textTransform: 'none' }}>
                            Reset All to Defaults
                        </Button>
                    </Grid>
                )}
            </Grid>
            <Dialog
                open={!!editAction}
                onClose={onCloseEditor}
                maxWidth='sm'
                fullWidth
                disableEscapeKeyDown
                classes={{
                    container: BlockBoardKeyboardShortcuts,
                }}
            >
                {editAction && (
                    <DialogTitle>
                        Edit Shortcut for <em>{displayShortcutAction(editAction)}</em>
                    </DialogTitle>
                )}
                <DialogContent>
                    <DialogContentText>
                        Press any key to change the shortcut, then click save.
                    </DialogContentText>
                    <DialogContentText>
                        Current Key: {displayKey(editKey) || <em>None</em>}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCloseEditor}>Cancel</Button>
                    <Button color='error' onClick={onRemoveKey}>
                        Remove Shortcut
                    </Button>
                    <Button onClick={onSaveEditor}>Save</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

export default KeyboardShortcuts;
