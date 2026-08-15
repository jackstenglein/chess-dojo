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
import { useTranslations } from 'next-intl';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { BoardApi } from '../../../../Board';
import { BlockBoardKeyboardShortcuts } from '../../../PgnBoard';
import { UnderboardApi } from '../Underboard';
import { DefaultUnderboardTab } from '../underboardTabs';
import { KeyBinding, ShortcutAction, ShortcutBindings } from './ShortcutAction';

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
     * A function that sets whether the keyboard shortcuts dialog is open.
     */
    setKeyboardShortcutsDialogOpen?: (open: boolean) => void;

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
 * Handles opening the keyboard shortcuts dialog.
 */
function handleViewShortcuts({ opts }: ShortcutHandlerProps) {
    opts?.setKeyboardShortcutsDialogOpen?.(true);
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
    [ShortcutAction.OpenPgnText]: handleOpenTab(DefaultUnderboardTab.PgnText),
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
    [ShortcutAction.ViewShortcuts]: handleViewShortcuts,
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
    const t = useTranslations('analysisBoard.underboard.settings');

    const keyLabels = useMemo(
        (): Record<string, string> => ({
            ArrowLeft: t('keyArrowLeft'),
            ArrowRight: t('keyArrowRight'),
            ArrowUp: t('keyArrowUp'),
            ArrowDown: t('keyArrowDown'),
            Space: t('keySpace'),
            Enter: t('keyEnter'),
            Escape: t('keyEscape'),
            Tab: t('keyTab'),
            Backspace: t('keyBackspace'),
        }),
        [t],
    );

    const displayKey = useCallback(
        (key: string | undefined): string | undefined => {
            if (!key) return key;
            if (key === ' ') return keyLabels.Space;
            return keyLabels[key] ?? key;
        },
        [keyLabels],
    );

    const displayShortcutAction = useMemo(
        () =>
            (action: ShortcutAction): string => {
                switch (action) {
                    case ShortcutAction.FirstMove:
                        return t('shortcutFirstMove');
                    case ShortcutAction.PreviousMove:
                        return t('shortcutPreviousMove');
                    case ShortcutAction.NextMove:
                        return t('shortcutNextMove');
                    case ShortcutAction.LastMove:
                        return t('shortcutLastMove');
                    case ShortcutAction.ToggleOrientation:
                        return t('shortcutFlipBoard');
                    case ShortcutAction.FirstVariation:
                        return t('shortcutFirstVariation');
                    case ShortcutAction.FirstMoveVariation:
                        return t('shortcutFirstMoveInVariation');
                    case ShortcutAction.LastMoveVariation:
                        return t('shortcutLastMoveInVariation');
                    case ShortcutAction.OpenPgnText:
                        return 'Open PGN Text';
                    case ShortcutAction.OpenFiles:
                        return t('shortcutOpenFiles');
                    case ShortcutAction.OpenTags:
                        return t('shortcutOpenTags');
                    case ShortcutAction.OpenEditor:
                        return t('shortcutOpenEditor');
                    case ShortcutAction.OpenComments:
                        return t('shortcutOpenComments');
                    case ShortcutAction.OpenDatabase:
                        return t('shortcutOpenPositionDatabase');
                    case ShortcutAction.OpenClocks:
                        return t('shortcutOpenClockUsage');
                    case ShortcutAction.OpenSettings:
                        return t('shortcutOpenSettings');
                    case ShortcutAction.OpenShare:
                        return t('shortcutOpenShare');
                    case ShortcutAction.FocusMainTextField:
                        return t('shortcutFocusMainTextField');
                    case ShortcutAction.FocusCommentTextField:
                        return t('shortcutFocusCommentTextField');
                    case ShortcutAction.UnfocusTextField:
                        return t('shortcutUnfocusTextField');
                    case ShortcutAction.InsertNullMove:
                        return t('shortcutInsertNullMove');
                    case ShortcutAction.InsertEngineMove:
                        return t('shortcutInsertTopEngineMove');
                    case ShortcutAction.NextPuzzle:
                        return t('shortcutNextPuzzle');
                    case ShortcutAction.ViewShortcuts:
                        return t('shortcutOpenKeyboardShortcutsDialog');
                }
            },
        [t],
    );

    const shortcutActionDescription = useMemo(
        () =>
            (action: ShortcutAction): string => {
                switch (action) {
                    case ShortcutAction.FirstMove:
                        return t('shortcutFirstMoveDesc');
                    case ShortcutAction.PreviousMove:
                        return t('shortcutPreviousMoveDesc');
                    case ShortcutAction.NextMove:
                        return t('shortcutNextMoveDesc');
                    case ShortcutAction.LastMove:
                        return t('shortcutLastMoveDesc');
                    case ShortcutAction.ToggleOrientation:
                        return t('shortcutToggleOrientationDesc');
                    case ShortcutAction.FirstVariation:
                        return t('shortcutFirstVariationDesc');
                    case ShortcutAction.FirstMoveVariation:
                        return t('shortcutFirstMoveVariationDesc');
                    case ShortcutAction.LastMoveVariation:
                        return t('shortcutLastMoveVariationDesc');
                    case ShortcutAction.OpenPgnText:
                        return 'Open the PGN Text tab.';
                    case ShortcutAction.OpenFiles:
                        return t('shortcutOpenFilesDesc');
                    case ShortcutAction.OpenTags:
                        return t('shortcutOpenTagsDesc');
                    case ShortcutAction.OpenEditor:
                        return t('shortcutOpenEditorDesc');
                    case ShortcutAction.OpenComments:
                        return t('shortcutOpenCommentsDesc');
                    case ShortcutAction.OpenDatabase:
                        return t('shortcutOpenDatabaseDesc');
                    case ShortcutAction.OpenClocks:
                        return t('shortcutOpenClocksDesc');
                    case ShortcutAction.OpenSettings:
                        return t('shortcutOpenSettingsDesc');
                    case ShortcutAction.OpenShare:
                        return t('shortcutOpenShareDesc');
                    case ShortcutAction.FocusMainTextField:
                        return t('shortcutFocusMainTextFieldDesc');
                    case ShortcutAction.FocusCommentTextField:
                        return t('shortcutFocusCommentTextFieldDesc');
                    case ShortcutAction.UnfocusTextField:
                        return t('shortcutUnfocusTextFieldDesc');
                    case ShortcutAction.InsertNullMove:
                        return t('shortcutInsertNullMoveDesc');
                    case ShortcutAction.InsertEngineMove:
                        return t('shortcutInsertEngineMoveDesc');
                    case ShortcutAction.NextPuzzle:
                        return t('shortcutNextPuzzleDesc');
                    case ShortcutAction.ViewShortcuts:
                        return t('shortcutViewShortcutsDesc');
                }
            },
        [t],
    );

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
            <Typography variant='h6'>{t('keyboardShortcutsTitle')}</Typography>
            <Typography
                variant='subtitle2'
                sx={{
                    color: 'text.secondary',
                }}
            >
                {t('keyboardShortcutsDisabledNote')}
            </Typography>

            <Grid
                container
                columnSpacing={2}
                sx={{
                    rowGap: 2,
                    alignItems: 'center',
                    mt: 1.5,
                }}
            >
                <Grid sx={{ borderBottom: 1, borderColor: 'divider' }} size={5}>
                    <Typography>{t('actionTableHeader')}</Typography>
                </Grid>
                <Grid sx={{ borderBottom: 1, borderColor: 'divider' }} size={3.5}>
                    <Typography
                        sx={{
                            textAlign: 'center',
                        }}
                    >
                        {t('modifierTableHeader')}
                    </Typography>
                </Grid>
                <Grid sx={{ borderBottom: 1, borderColor: 'divider' }} size={3.5}>
                    <Typography
                        sx={{
                            textAlign: 'center',
                        }}
                    >
                        {t('keyTableHeader')}
                    </Typography>
                </Grid>
                {actions.map((a) => {
                    const binding = keyBindings[a] || ShortcutBindings.default[a];
                    return (
                        <Fragment key={a}>
                            <Grid size={5}>
                                <Stack
                                    direction='row'
                                    spacing={1}
                                    sx={{
                                        alignItems: 'center',
                                    }}
                                >
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
                                    slotProps={{
                                        select: { displayEmpty: true },
                                    }}
                                >
                                    <MenuItem value=''>
                                        <em>{t('modifierNone')}</em>
                                    </MenuItem>
                                    <MenuItem value='Shift'>{t('modifierShift')}</MenuItem>
                                    <MenuItem value='Control'>{t('modifierControl')}</MenuItem>
                                    <MenuItem value='Alt'>{t('modifierAltOption')}</MenuItem>
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
                            {t('resetAllToDefaultsButton')}
                        </Button>
                    </Grid>
                )}
            </Grid>
            <Dialog
                open={!!editAction}
                onClose={(_event, reason) => {
                    if (reason === 'escapeKeyDown') {
                        return;
                    }
                    onCloseEditor();
                }}
                maxWidth='sm'
                fullWidth
                classes={{
                    container: BlockBoardKeyboardShortcuts,
                }}
            >
                {editAction && (
                    <DialogTitle>
                        {t.rich('editShortcutDialogTitle', {
                            actionName: displayShortcutAction(editAction),
                            action: (chunks) => <em>{chunks}</em>,
                        })}
                    </DialogTitle>
                )}
                <DialogContent>
                    <DialogContentText>{t('editShortcutInstructions')}</DialogContentText>
                    <DialogContentText>
                        {(() => {
                            const displayedKey = displayKey(editKey);
                            return displayedKey
                                ? t('currentKeyDisplaySet', { key: displayedKey })
                                : t.rich('currentKeyDisplayNone', {
                                      em: (chunks) => <em>{chunks}</em>,
                                  });
                        })()}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCloseEditor}>{t('settingsCancelButton')}</Button>
                    <Button color='error' onClick={onRemoveKey}>
                        {t('removeShortcutButton')}
                    </Button>
                    <Button onClick={onSaveEditor}>{t('saveButton')}</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

export default KeyboardShortcuts;
