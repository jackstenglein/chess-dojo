import {
    CORRECT_SOUND_KEY,
    INCORRECT_SOUND_KEY,
} from '@/components/puzzles/settings/puzzleSettingsKeys';
import { HIGHLIGHT_ENGINE_LINES } from '@/stockfish/engine/engine';
import {
    Box,
    Checkbox,
    FormControlLabel,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useLocalStorage } from 'usehooks-ts';
import KeyboardShortcuts, { KeyboardShortcutsProps } from './KeyboardShortcuts';

export const BoardStyleKey = 'boardStyle';
export const PieceStyleKey = 'pieceStyle';
export const CoordinateStyleKey = 'coordinateStyle';
export const GoToEndButtonBehaviorKey = 'goToEndBehavior';
export const VariationBehaviorKey = 'variationBehavior2';
/** Whether to show elapsed move times in the PGN text. */
export const ShowMoveTimesInPgn = {
    Key: 'showMoveTimesInPgn',
    Default: true,
} as const;
export const ShowLegalMovesKey = 'showLegalMoves';
export const CapturedMaterialBehaviorKey = 'capturedMaterialBehavior';
export const ShowGlyphsKey = 'showGlyphsOnBoard';

export const HideEngine = {
    Key: 'hideEngine',
    Default: false,
} as const;

/** Whether to show suggested variations in the PGN text. */
export const ShowSuggestedVariations = {
    key: 'showSuggestedVariations',
    default: true,
} as const;

/** Whether to scroll on the board to go to the next move. */
export const ScrollToMove = {
    key: 'scrollToMove',
    default: false,
} as const;

export enum BoardStyle {
    Standard = 'STANDARD',
    Moon = 'MOON',
    Summer = 'SUMMER',
    Wood = 'WOOD',
    Walnut = 'WALNUT',
    CherryBlossom = 'CHERRY_BLOSSOM',
    Ocean = 'OCEAN',
}

export enum PieceStyle {
    Standard = 'STANDARD',
    Pixel = 'PIXEL',
    Spatial = 'WOOD',
    Celtic = 'CELTIC',
    Fantasy = 'FANTASY',
    Chessnut = 'CHERRY',
    Cburnett = 'WALNUT',
    ThreeD = 'THREE_D',
    ThreeDRedBlue = 'THREE_D_RED_BLUE',
    Disguised = 'DISGUISED',
    Invisible = 'INVISIBLE',
}

export enum CoordinateStyle {
    None = 'NONE',
    RankFileOnly = 'RANK_FILE',
    AllSquares = 'ALL_SQUARES',
}

export enum GoToEndButtonBehavior {
    SingleClick = 'SINGLE_CLICK',
    DoubleClick = 'DOUBLE_CLICK',
    Hidden = 'HIDDEN',
}

export enum VariationBehavior {
    None = 'NONE',
    Dialog = 'DIALOG',
}

export enum CapturedMaterialBehavior {
    None = 'NONE',
    Difference = 'DIFFERENCE',
    All = 'ALL',
}

export enum ViewerSetting {
    BoardStyle,
    PieceStyle,
    CoordinateStyle,
    StartEndButtonBehavior,
    VariationBehavior,
    CapturedMaterialDisplay,
    ShowLegalMoves,
    ShowGlyphsOnBoard,
    ShowElapsedTimeNextToMove,
    ShowEngine,
    HighlightEngineLines,
    DisplaySuggestedVariations,
    ScrollOnBoardToMove,
    CorrectSolitaireMoveSound,
    IncorrectSolitaireMoveSound,
}

const ViewerSettings = ({
    enabledSettings,
    keyboardShortcutsProps,
}: {
    enabledSettings?: Partial<Record<ViewerSetting, boolean>>;
    keyboardShortcutsProps?: KeyboardShortcutsProps;
}) => {
    const [boardStyle, setBoardStyle] = useLocalStorage<string>(BoardStyleKey, BoardStyle.Standard);
    const [pieceStyle, setPieceStyle] = useLocalStorage<string>(PieceStyleKey, PieceStyle.Standard);
    const [coordinateStyle, setCoordinateStyle] = useLocalStorage<CoordinateStyle>(
        CoordinateStyleKey,
        CoordinateStyle.RankFileOnly,
    );
    const [goToEndBehavior, setGoToEndBehavior] = useLocalStorage<string>(
        GoToEndButtonBehaviorKey,
        GoToEndButtonBehavior.SingleClick,
    );
    const [variationBehavior, setVariationBehavior] = useLocalStorage<string>(
        VariationBehaviorKey,
        VariationBehavior.Dialog,
    );
    const [showMoveTimes, setShowMoveTimes] = useLocalStorage<boolean>(
        ShowMoveTimesInPgn.Key,
        ShowMoveTimesInPgn.Default,
    );
    const [capturedMaterialBehavior, setCapturedMaterialBehavior] = useLocalStorage<string>(
        CapturedMaterialBehaviorKey,
        CapturedMaterialBehavior.Difference,
    );
    const [showLegalMoves, setShowLegalMoves] = useLocalStorage(ShowLegalMovesKey, true);
    const [showGlyphs, setShowGlyphs] = useLocalStorage(ShowGlyphsKey, false);

    const [hideEngine, setHideEngine] = useLocalStorage<boolean>(
        HideEngine.Key,
        HideEngine.Default,
    );
    const [highlightEngineLines, setHighlightEngineLines] = useLocalStorage<boolean>(
        HIGHLIGHT_ENGINE_LINES.Key,
        HIGHLIGHT_ENGINE_LINES.Default,
    );
    const [showSuggestedVariations, setShowSuggestedVariations] = useLocalStorage<boolean>(
        ShowSuggestedVariations.key,
        ShowSuggestedVariations.default,
    );
    const [scrollToMove, setScrollToMove] = useLocalStorage<boolean>(
        ScrollToMove.key,
        ScrollToMove.default,
    );
    const [correctSound, setCorrectSound] = useLocalStorage(CORRECT_SOUND_KEY, true);
    const [incorrectSound, setIncorrectSound] = useLocalStorage(INCORRECT_SOUND_KEY, true);

    return (
        <Stack spacing={3}>
            <Typography variant='h5'>Viewer Settings</Typography>

            <Box id='chessdojo-integrations' sx={{ '&:empty': { mt: '0 !important' } }}></Box>

            {(!enabledSettings || enabledSettings[ViewerSetting.BoardStyle]) && (
                <TextField
                    select
                    label='Board Style'
                    value={boardStyle}
                    onChange={(e) => setBoardStyle(e.target.value)}
                >
                    <MenuItem value={BoardStyle.Standard}>Standard</MenuItem>
                    <MenuItem value={BoardStyle.CherryBlossom}>Cherry Blossom</MenuItem>
                    <MenuItem value={BoardStyle.Moon}>Moon</MenuItem>
                    <MenuItem value={BoardStyle.Ocean}>Ocean</MenuItem>
                    <MenuItem value={BoardStyle.Summer}>Summer</MenuItem>
                    <MenuItem value={BoardStyle.Walnut}>Walnut</MenuItem>
                    <MenuItem value={BoardStyle.Wood}>Wood</MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.PieceStyle]) && (
                <TextField
                    select
                    label='Piece Style'
                    value={pieceStyle}
                    onChange={(e) => setPieceStyle(e.target.value)}
                >
                    <MenuItem value={PieceStyle.Standard}>Standard</MenuItem>
                    <MenuItem value={PieceStyle.Cburnett}>Cburnett</MenuItem>
                    <MenuItem value={PieceStyle.Celtic}>Celtic</MenuItem>
                    <MenuItem value={PieceStyle.Chessnut}>Chessnut</MenuItem>
                    <MenuItem value={PieceStyle.Fantasy}>Fantasy</MenuItem>
                    <MenuItem value={PieceStyle.Pixel}>Pixel</MenuItem>
                    <MenuItem value={PieceStyle.Spatial}>Spatial</MenuItem>
                    <MenuItem value={PieceStyle.ThreeD}>3D</MenuItem>
                    <MenuItem value={PieceStyle.ThreeDRedBlue}>3D (Red/Blue)</MenuItem>
                    <MenuItem value={PieceStyle.Disguised}>Disguised</MenuItem>
                    <MenuItem value={PieceStyle.Invisible}>Invisible</MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.CoordinateStyle]) && (
                <TextField
                    select
                    label='Coordinate Style'
                    value={coordinateStyle}
                    onChange={(e) => setCoordinateStyle(e.target.value as CoordinateStyle)}
                >
                    <MenuItem value={CoordinateStyle.None}>None</MenuItem>
                    <MenuItem value={CoordinateStyle.RankFileOnly}>Rank and File Only</MenuItem>
                    <MenuItem value={CoordinateStyle.AllSquares}>Every Square</MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.StartEndButtonBehavior]) && (
                <TextField
                    select
                    label='Go to Start/End Button Behavior'
                    value={goToEndBehavior}
                    onChange={(e) => setGoToEndBehavior(e.target.value)}
                >
                    <MenuItem value={GoToEndButtonBehavior.SingleClick}>Single Click</MenuItem>
                    <MenuItem value={GoToEndButtonBehavior.DoubleClick}>Double Click</MenuItem>
                    <MenuItem value={GoToEndButtonBehavior.Hidden}>Hidden</MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.VariationBehavior]) && (
                <TextField
                    select
                    label='Variation Behavior'
                    value={variationBehavior}
                    onChange={(e) => setVariationBehavior(e.target.value)}
                >
                    <MenuItem value={VariationBehavior.None}>None</MenuItem>
                    <MenuItem value={VariationBehavior.Dialog}>Prompt in Dialog</MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.CapturedMaterialDisplay]) && (
                <TextField
                    select
                    label='Captured Material Display'
                    value={capturedMaterialBehavior}
                    onChange={(e) => setCapturedMaterialBehavior(e.target.value)}
                >
                    <MenuItem value={CapturedMaterialBehavior.None}>None</MenuItem>
                    <MenuItem value={CapturedMaterialBehavior.Difference}>
                        Show Difference Only
                    </MenuItem>
                    <MenuItem value={CapturedMaterialBehavior.All}>
                        Show All Captured Material
                    </MenuItem>
                </TextField>
            )}

            <Stack>
                {(!enabledSettings || enabledSettings[ViewerSetting.ShowLegalMoves]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showLegalMoves}
                                onChange={(e) => setShowLegalMoves(e.target.checked)}
                            />
                        }
                        label='Show legal moves'
                    />
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.ShowGlyphsOnBoard]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showGlyphs}
                                onChange={(e) => setShowGlyphs(e.target.checked)}
                            />
                        }
                        label='Show glyphs on board'
                    />
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.ShowElapsedTimeNextToMove]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showMoveTimes}
                                onChange={(e) => setShowMoveTimes(e.target.checked)}
                            />
                        }
                        label='Show elapsed time next to move'
                    />
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.ShowEngine]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!hideEngine}
                                onChange={(e) => setHideEngine(!e.target.checked)}
                            />
                        }
                        label='Show engine'
                    />
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.HighlightEngineLines]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={highlightEngineLines}
                                onChange={(e) => setHighlightEngineLines(e.target.checked)}
                            />
                        }
                        label='Highlight engine lines in PGN text'
                    />
                )}

                {(!enabledSettings ||
                    enabledSettings[ViewerSetting.DisplaySuggestedVariations]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showSuggestedVariations}
                                onChange={(e) => setShowSuggestedVariations(e.target.checked)}
                            />
                        }
                        label="Display other users' suggested variations in PGN text"
                    />
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.ScrollOnBoardToMove]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={scrollToMove}
                                onChange={(e) => setScrollToMove(e.target.checked)}
                            />
                        }
                        label='Scroll on board to go to next/previous move'
                    />
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.CorrectSolitaireMoveSound]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={correctSound}
                                onChange={(e) => setCorrectSound(e.target.checked)}
                            />
                        }
                        label='Play sound on correct move (in solitaire chess)'
                    />
                )}

                {(!enabledSettings ||
                    enabledSettings[ViewerSetting.IncorrectSolitaireMoveSound]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={incorrectSound}
                                onChange={(e) => setIncorrectSound(e.target.checked)}
                            />
                        }
                        label='Play sound on incorrect move (in solitaire chess)'
                    />
                )}
            </Stack>

            <KeyboardShortcuts {...keyboardShortcutsProps} />
        </Stack>
    );
};

export default ViewerSettings;
