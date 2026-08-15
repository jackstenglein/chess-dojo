import {
    CORRECT_SOUND_KEY,
    INCORRECT_SOUND_KEY,
} from '@/components/puzzles/settings/puzzleSettingsKeys';
import { HIGHLIGHT_ENGINE_LINES, PERSIST_ENGINE_LINES } from '@/stockfish/engine/engine';
import {
    Box,
    Checkbox,
    FormControlLabel,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useLocalStorage } from 'usehooks-ts';
import KeyboardShortcuts, { KeyboardShortcutsProps } from './KeyboardShortcuts';
import { CoordinateSize, CoordinateSizeKey } from './viewerSettingsConstants';

export { CoordinateSize, CoordinateSizeKey } from './viewerSettingsConstants';

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

export const InlineNotationSetting = {
    key: 'pgn-editor/inline-notation',
    default: false,
} as const;

/** Whether to show suggested variations in the PGN text. */
export const ShowSuggestedVariations = {
    key: 'showSuggestedVariations',
    default: true,
} as const;

/** Whether to show position comments in the PGN text. */
export const ShowInlineCommentsInPgn = {
    key: 'showInlineCommentsInPgn',
    default: true,
} as const;

/** Whether to automatically save variations as comments on other users games. */
export const AutoSaveVariations = {
    key: 'autoSaveVariations',
    default: false,
} as const;

/** Whether to play sounds for piece moves on the board. */
export const PieceSounds = {
    key: 'pieceSounds',
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
    CoordinateSize,
    StartEndButtonBehavior,
    VariationBehavior,
    CapturedMaterialDisplay,
    ShowLegalMoves,
    ShowGlyphsOnBoard,
    ShowElapsedTimeNextToMove,
    ShowEngine,
    HighlightEngineLines,
    PersistEngineLines,
    DisplaySuggestedVariations,
    DisplayInlineComments,
    ScrollOnBoardToMove,
    PieceSounds,
    CorrectSolitaireMoveSound,
    IncorrectSolitaireMoveSound,
    InlineNotation,
}

const ViewerSettings = ({
    enabledSettings,
    keyboardShortcutsProps,
}: {
    enabledSettings?: Partial<Record<ViewerSetting, boolean>>;
    keyboardShortcutsProps?: KeyboardShortcutsProps;
}) => {
    const t = useTranslations('analysisBoard.underboard.settings');
    const [boardStyle, setBoardStyle] = useLocalStorage<string>(BoardStyleKey, BoardStyle.Standard);
    const [pieceStyle, setPieceStyle] = useLocalStorage<string>(PieceStyleKey, PieceStyle.Standard);
    const [coordinateStyle, setCoordinateStyle] = useLocalStorage<CoordinateStyle>(
        CoordinateStyleKey,
        CoordinateStyle.RankFileOnly,
    );
    const [coordinateSize, setCoordinateSize] = useLocalStorage<CoordinateSize>(
        CoordinateSizeKey,
        CoordinateSize.Standard,
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
    const [persistEngineLines, setPersistEngineLines] = useLocalStorage<boolean>(
        PERSIST_ENGINE_LINES.Key,
        PERSIST_ENGINE_LINES.Default,
    );
    const [showSuggestedVariations, setShowSuggestedVariations] = useLocalStorage<boolean>(
        ShowSuggestedVariations.key,
        ShowSuggestedVariations.default,
    );
    const [showInlineCommentsInPgn, setShowInlineCommentsInPgn] = useLocalStorage<boolean>(
        ShowInlineCommentsInPgn.key,
        ShowInlineCommentsInPgn.default,
    );
    const [autoSaveVariations, setAutoSaveVariations] = useLocalStorage<boolean>(
        AutoSaveVariations.key,
        AutoSaveVariations.default,
    );
    const [scrollToMove, setScrollToMove] = useLocalStorage<boolean>(
        ScrollToMove.key,
        ScrollToMove.default,
    );
    const [pieceSounds, setPieceSounds] = useLocalStorage<boolean>(
        PieceSounds.key,
        PieceSounds.default,
    );
    const [inlineNotation, setInlineNotation] = useLocalStorage<boolean>(
        InlineNotationSetting.key,
        InlineNotationSetting.default,
    );

    const [correctSound, setCorrectSound] = useLocalStorage(CORRECT_SOUND_KEY, true);
    const [incorrectSound, setIncorrectSound] = useLocalStorage(INCORRECT_SOUND_KEY, true);

    return (
        <Stack spacing={3}>
            <Typography variant='h5'>{t('viewerSettingsTitle')}</Typography>

            <Box id='chessdojo-integrations' sx={{ '&:empty': { mt: '0 !important' } }}></Box>

            {(!enabledSettings || enabledSettings[ViewerSetting.BoardStyle]) && (
                <TextField
                    select
                    label={t('boardStyleLabel')}
                    value={boardStyle}
                    onChange={(e) => setBoardStyle(e.target.value)}
                >
                    <MenuItem value={BoardStyle.Standard}>{t('boardStyleStandard')}</MenuItem>
                    <MenuItem value={BoardStyle.CherryBlossom}>
                        {t('boardStyleCherryBlossom')}
                    </MenuItem>
                    <MenuItem value={BoardStyle.Moon}>{t('boardStyleMoon')}</MenuItem>
                    <MenuItem value={BoardStyle.Ocean}>{t('boardStyleOcean')}</MenuItem>
                    <MenuItem value={BoardStyle.Summer}>{t('boardStyleSummer')}</MenuItem>
                    <MenuItem value={BoardStyle.Walnut}>{t('boardStyleWalnut')}</MenuItem>
                    <MenuItem value={BoardStyle.Wood}>{t('boardStyleWood')}</MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.PieceStyle]) && (
                <TextField
                    select
                    label={t('pieceStyleLabel')}
                    value={pieceStyle}
                    onChange={(e) => setPieceStyle(e.target.value)}
                >
                    <MenuItem value={PieceStyle.Standard}>{t('pieceStyleStandard')}</MenuItem>
                    <MenuItem value={PieceStyle.Cburnett}>{t('pieceStyleCburnett')}</MenuItem>
                    <MenuItem value={PieceStyle.Celtic}>{t('pieceStyleCeltic')}</MenuItem>
                    <MenuItem value={PieceStyle.Chessnut}>{t('pieceStyleChessnut')}</MenuItem>
                    <MenuItem value={PieceStyle.Fantasy}>{t('pieceStyleFantasy')}</MenuItem>
                    <MenuItem value={PieceStyle.Pixel}>{t('pieceStylePixel')}</MenuItem>
                    <MenuItem value={PieceStyle.Spatial}>{t('pieceStyleSpatial')}</MenuItem>
                    <MenuItem value={PieceStyle.ThreeD}>{t('pieceStyle3D')}</MenuItem>
                    <MenuItem value={PieceStyle.ThreeDRedBlue}>{t('pieceStyle3DRedBlue')}</MenuItem>
                    <MenuItem value={PieceStyle.Disguised}>{t('pieceStyleDisguised')}</MenuItem>
                    <MenuItem value={PieceStyle.Invisible}>{t('pieceStyleInvisible')}</MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.CoordinateStyle]) && (
                <TextField
                    select
                    label={t('coordinateStyleLabel')}
                    value={coordinateStyle}
                    onChange={(e) => setCoordinateStyle(e.target.value as CoordinateStyle)}
                >
                    <MenuItem value={CoordinateStyle.None}>{t('coordinateStyleNone')}</MenuItem>
                    <MenuItem value={CoordinateStyle.RankFileOnly}>
                        {t('coordinateStyleRankFileOnly')}
                    </MenuItem>
                    <MenuItem value={CoordinateStyle.AllSquares}>
                        {t('coordinateStyleEverySquare')}
                    </MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.CoordinateSize]) && (
                <TextField
                    select
                    label='Coordinate Size'
                    value={coordinateSize}
                    onChange={(e) => setCoordinateSize(e.target.value as CoordinateSize)}
                >
                    <MenuItem value={CoordinateSize.Standard}>Standard</MenuItem>
                    <MenuItem value={CoordinateSize.Large}>Large</MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.StartEndButtonBehavior]) && (
                <TextField
                    select
                    label={t('goToEndButtonBehaviorLabel')}
                    value={goToEndBehavior}
                    onChange={(e) => setGoToEndBehavior(e.target.value)}
                >
                    <MenuItem value={GoToEndButtonBehavior.SingleClick}>
                        {t('goToEndButtonBehaviorSingleClick')}
                    </MenuItem>
                    <MenuItem value={GoToEndButtonBehavior.DoubleClick}>
                        {t('goToEndButtonBehaviorDoubleClick')}
                    </MenuItem>
                    <MenuItem value={GoToEndButtonBehavior.Hidden}>
                        {t('goToEndButtonBehaviorHidden')}
                    </MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.VariationBehavior]) && (
                <TextField
                    select
                    label={t('variationBehaviorLabel')}
                    value={variationBehavior}
                    onChange={(e) => setVariationBehavior(e.target.value)}
                >
                    <MenuItem value={VariationBehavior.None}>{t('variationBehaviorNone')}</MenuItem>
                    <MenuItem value={VariationBehavior.Dialog}>
                        {t('variationBehaviorPromptDialog')}
                    </MenuItem>
                </TextField>
            )}

            {(!enabledSettings || enabledSettings[ViewerSetting.CapturedMaterialDisplay]) && (
                <TextField
                    select
                    label={t('capturedMaterialDisplayLabel')}
                    value={capturedMaterialBehavior}
                    onChange={(e) => setCapturedMaterialBehavior(e.target.value)}
                >
                    <MenuItem value={CapturedMaterialBehavior.None}>
                        {t('capturedMaterialDisplayNone')}
                    </MenuItem>
                    <MenuItem value={CapturedMaterialBehavior.Difference}>
                        {t('capturedMaterialDisplayDifferenceOnly')}
                    </MenuItem>
                    <MenuItem value={CapturedMaterialBehavior.All}>
                        {t('capturedMaterialDisplayAll')}
                    </MenuItem>
                </TextField>
            )}

            <Stack>
                {!enabledSettings && (
                    <Typography variant='h6'>{t('boardSectionHeader')}</Typography>
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.ShowLegalMoves]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showLegalMoves}
                                onChange={(e) => setShowLegalMoves(e.target.checked)}
                            />
                        }
                        label={t('showLegalMovesLabel')}
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
                        label={t('showGlyphsOnBoardLabel')}
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
                        label={t('scrollOnBoardLabel')}
                    />
                )}

                {!enabledSettings && (
                    <Typography
                        variant='h6'
                        sx={{
                            mt: 1,
                        }}
                    >
                        {t('pgnTextSectionHeader')}
                    </Typography>
                )}
                {(!enabledSettings || enabledSettings[ViewerSetting.InlineNotation]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={inlineNotation}
                                onChange={(e) => setInlineNotation(e.target.checked)}
                            />
                        }
                        label='Enable Inline PGN notation'
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
                        label={t('showElapsedTimeLabel')}
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
                        label={t('displayOtherUsersSuggestionsLabel')}
                    />
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.DisplayInlineComments]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showInlineCommentsInPgn}
                                onChange={(e) => setShowInlineCommentsInPgn(e.target.checked)}
                            />
                        }
                        label='Display comments in PGN text'
                    />
                )}

                {(!enabledSettings ||
                    enabledSettings[ViewerSetting.DisplaySuggestedVariations]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={autoSaveVariations}
                                onChange={(e) => setAutoSaveVariations(e.target.checked)}
                            />
                        }
                        label='Automatically save my suggested variations as comments'
                    />
                )}

                {!enabledSettings && (
                    <Typography
                        variant='h6'
                        sx={{
                            mt: 1,
                        }}
                    >
                        {t('engineSectionHeader')}
                    </Typography>
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.ShowEngine]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!hideEngine}
                                onChange={(e) => setHideEngine(!e.target.checked)}
                            />
                        }
                        label={t('showEngineLabel')}
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
                        label={t('highlightEngineLinesLabel')}
                    />
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.PersistEngineLines]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={persistEngineLines}
                                onChange={(e) => setPersistEngineLines(e.target.checked)}
                            />
                        }
                        label={t('showCalculatedLinesLabel')}
                    />
                )}

                {!enabledSettings && (
                    <Typography
                        variant='h6'
                        sx={{
                            mt: 1,
                        }}
                    >
                        {t('soundsSectionHeader')}
                    </Typography>
                )}

                {(!enabledSettings || enabledSettings[ViewerSetting.PieceSounds]) && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={pieceSounds}
                                onChange={(e) => setPieceSounds(e.target.checked)}
                            />
                        }
                        label='Play sounds for piece moves (move, capture, check)'
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
                        label={t('playCorrectSoundLabel')}
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
                        label={t('playIncorrectSoundLabel')}
                    />
                )}
            </Stack>

            <KeyboardShortcuts {...keyboardShortcutsProps} />
        </Stack>
    );
};

export default ViewerSettings;
