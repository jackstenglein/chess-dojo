export enum ShortcutAction {
    /** Go to the starting position of the game. */
    FirstMove = 'FIRST_MOVE',

    /** Go to the first move of the current variation. */
    FirstMoveVariation = 'FIRST_MOVE_VARIATION',

    /** Go to the move before the current move. */
    PreviousMove = 'PREVIOUS_MOVE',

    /** Go to the move after the current move. */
    NextMove = 'NEXT_MOVE',

    /** Go to the last move of the game. */
    LastMove = 'LAST_MOVE',

    /** Go to the last move of the current variation. */
    LastMoveVariation = 'LAST_MOVE_VARIATION',

    /** Toggle the orientation of the board. */
    ToggleOrientation = 'TOGGLE_ORIENTATION',

    /** Go to the first variation of the next move, or the next move if it has no variations. */
    FirstVariation = 'FIRST_VARIATION',

    /** Open the files tab. */
    OpenFiles = 'OPEN_FILES',

    /** Open the PGN tags tab. */
    OpenTags = 'OPEN_TAGS',

    /** Open the PGN editor tab, if present. */
    OpenEditor = 'OPEN_EDITOR',

    /** Open the comments tab. */
    OpenComments = 'OPEN_COMMENTS',

    /** Open the database explorer tab. */
    OpenDatabase = 'OPEN_DATABASE',

    /** Open the clock usage tab. */
    OpenClocks = 'OPEN_CLOCKS',

    /** Open the share tab. */
    OpenShare = 'OPEN_SHARE',

    /** Open the settings tab. */
    OpenSettings = 'OPEN_SETTINGS',

    /**
     * Opens the editor tab and focuses the editor text field. If the editor tab is not present,
     * the comment tab textfield is focused.
     */
    FocusMainTextField = 'FOCUS_MAIN_TEXTFIELD',

    /** Opens the comments tab and focuses the text field. */
    FocusCommentTextField = 'FOCUS_COMMENT_TEXTFIELD',

    /** Unfocuses any currently-focused text field. */
    UnfocusTextField = 'UNFOCUS_TEXTFIELD',

    /** Inserts a null move. */
    InsertNullMove = 'INSERT_NULL_MOVE',

    /** Inserts the engine's top move. */
    InsertEngineMove = 'INSERT_ENGINE_MOVE',

    /** Goes to the next puzzle. */
    NextPuzzle = 'NEXT_PUZZLE',

    ViewKey = 'VIEW_KEYS',
}

export interface KeyBinding {
    /** The modifier key set on the key binding, or the empty string if none is set. */
    modifier: string;

    /** The key set on the key binding, or the empty string if none is set. */
    key: string;
}

/** The local storage key and default settings for shortcut bindings. */
export const ShortcutBindings = {
    key: 'boardKeyBindings',
    default: {
        [ShortcutAction.FirstMove]: { modifier: '', key: '' },
        [ShortcutAction.PreviousMove]: { modifier: '', key: 'ArrowLeft' },
        [ShortcutAction.NextMove]: { modifier: '', key: 'ArrowRight' },
        [ShortcutAction.LastMove]: { modifier: '', key: '' },
        [ShortcutAction.ToggleOrientation]: { modifier: '', key: 'f' },
        [ShortcutAction.FirstVariation]: { modifier: 'Shift', key: 'ArrowRight' },
        [ShortcutAction.FirstMoveVariation]: { modifier: '', key: '' },
        [ShortcutAction.LastMoveVariation]: { modifier: '', key: '' },
        [ShortcutAction.OpenFiles]: { modifier: '', key: '' },
        [ShortcutAction.OpenTags]: { modifier: '', key: '' },
        [ShortcutAction.OpenEditor]: { modifier: '', key: '' },
        [ShortcutAction.OpenComments]: { modifier: '', key: '' },
        [ShortcutAction.OpenDatabase]: { modifier: '', key: '' },
        [ShortcutAction.OpenClocks]: { modifier: '', key: '' },
        [ShortcutAction.OpenSettings]: { modifier: '', key: '' },
        [ShortcutAction.OpenShare]: { modifier: '', key: '' },
        [ShortcutAction.FocusMainTextField]: { modifier: '', key: '' },
        [ShortcutAction.FocusCommentTextField]: { modifier: '', key: '' },
        [ShortcutAction.UnfocusTextField]: { modifier: '', key: '' },
        [ShortcutAction.InsertNullMove]: { modifier: '', key: '' },
        [ShortcutAction.InsertEngineMove]: { modifier: '', key: 'Space' },
        [ShortcutAction.NextPuzzle]: { modifier: '', key: 'Space' },
        [ShortcutAction.ViewKey]: { modifier: '', key: 'd' },
    },
} as const;
