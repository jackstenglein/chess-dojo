import { ShortcutAction } from '@/board/pgn/boardTools/underboard/settings/ShortcutAction';
import ViewerSettings, {
    ViewerSetting,
} from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import { useChess } from '@/board/pgn/PgnBoard';
import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import {
    CardContent,
    Checkbox,
    FormControlLabel,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useLocalStorage } from 'usehooks-ts';
import {
    CORRECT_SOUND_KEY,
    DIFFICULTY_KEY,
    INCORRECT_SOUND_KEY,
    RATED_KEY,
    SHOW_RATING_KEY,
    SHOW_STREAK_KEY,
    SHOW_TIMER_KEY,
    THEME_KEY,
} from '../settings/puzzleSettingsKeys';

const viewerSettings = {
    [ViewerSetting.BoardStyle]: true,
    [ViewerSetting.PieceStyle]: true,
    [ViewerSetting.CoordinateStyle]: true,
    [ViewerSetting.CoordinateSize]: true,
    [ViewerSetting.StartEndButtonBehavior]: true,
    [ViewerSetting.VariationBehavior]: true,
    [ViewerSetting.ShowLegalMoves]: true,
    [ViewerSetting.ScrollOnBoardToMove]: true,
};

const keyboardShortcutProps = {
    actions: [
        ShortcutAction.NextPuzzle,
        ShortcutAction.FirstMove,
        ShortcutAction.FirstMoveVariation,
        ShortcutAction.PreviousMove,
        ShortcutAction.NextMove,
        ShortcutAction.LastMove,
        ShortcutAction.LastMoveVariation,
        ShortcutAction.ToggleOrientation,
    ],
};

export function PuzzleSettings({
    onChangeOptions,
}: {
    /** A callback to invoke when the user changes options that affect the next puzzle. */
    onChangeOptions: () => void;
}) {
    return (
        <CardContent sx={{ minHeight: 1 }}>
            <PuzzleSpecificSettings onChangeOptions={onChangeOptions} />
            <ViewerSettings
                enabledSettings={viewerSettings}
                keyboardShortcutsProps={keyboardShortcutProps}
            />
        </CardContent>
    );
}

function PuzzleSpecificSettings({
    onChangeOptions,
}: {
    /** A callback to invoke when the user changes options that affect the next puzzle. */
    onChangeOptions: () => void;
}) {
    const t = useTranslations('puzzles.settings');
    const { solitaire } = useChess();

    const [rated, setRated] = useLocalStorage(RATED_KEY, true);
    const [showTimer, setShowTimer] = useLocalStorage(SHOW_TIMER_KEY, true);
    const [showRating, setShowRating] = useLocalStorage(SHOW_RATING_KEY, true);
    const [showStreak, setShowStreak] = useLocalStorage(SHOW_STREAK_KEY, true);
    const [difficulty, setDifficulty] = useLocalStorage(DIFFICULTY_KEY, 'standard');
    const [themes, setThemes] = useLocalStorage(THEME_KEY, ['mateIn1', 'mateIn2', 'mateIn3']);
    const [correctSound, setCorrectSound] = useLocalStorage(CORRECT_SOUND_KEY, true);
    const [incorrectSound, setIncorrectSound] = useLocalStorage(INCORRECT_SOUND_KEY, true);

    return (
        <Stack
            spacing={3}
            sx={{
                mb: 3,
            }}
        >
            <Stack spacing={0.5}>
                <Typography variant='h5'>{t('title')}</Typography>

                {!solitaire?.complete && <Typography>{t('inProgressNote')}</Typography>}
            </Stack>

            <Stack>
                <MultipleSelectChip
                    label={t('themesLabel')}
                    selected={themes}
                    setSelected={(v) => {
                        setThemes(v);
                        onChangeOptions();
                    }}
                    options={[
                        { value: 'mateIn1', label: t('themeMateIn1') },
                        { value: 'mateIn2', label: t('themeMateIn2') },
                        { value: 'mateIn3', label: t('themeMateIn3') },
                    ]}
                    size='small'
                    sx={{ mb: 2.5 }}
                    disabled={!solitaire?.complete}
                />

                <TextField
                    label={t('difficultyLabel')}
                    select
                    value={difficulty}
                    size='small'
                    sx={{ mb: 1 }}
                    onChange={(e) => {
                        setDifficulty(e.target.value);
                        onChangeOptions();
                    }}
                    disabled={!solitaire?.complete}
                >
                    <MenuItem value='easiest'>{t('difficultyEasiest')}</MenuItem>
                    <MenuItem value='easier'>{t('difficultyEasier')}</MenuItem>
                    <MenuItem value='standard'>{t('difficultyStandard')}</MenuItem>
                    <MenuItem value='harder'>{t('difficultyHarder')}</MenuItem>
                    <MenuItem value='hardest'>{t('difficultyHardest')}</MenuItem>
                </TextField>

                <FormControlLabel
                    control={
                        <Checkbox checked={rated} onChange={(e) => setRated(e.target.checked)} />
                    }
                    label={t('rated')}
                    disabled={!solitaire?.complete}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showStreak}
                            onChange={(e) => setShowStreak(e.target.checked)}
                        />
                    }
                    label={t('showStreak')}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showRating}
                            onChange={(e) => setShowRating(e.target.checked)}
                        />
                    }
                    label={t('showRating')}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showTimer}
                            onChange={(e) => setShowTimer(e.target.checked)}
                        />
                    }
                    label={t('showTimer')}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={correctSound}
                            onChange={(e) => setCorrectSound(e.target.checked)}
                        />
                    }
                    label={t('playSoundCorrect')}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={incorrectSound}
                            onChange={(e) => setIncorrectSound(e.target.checked)}
                        />
                    }
                    label={t('playSoundIncorrect')}
                />
                {/* TODO: re-enable this */}
                {/* <FormControlLabel
                        control={<Checkbox checked={false} disabled />}
                        label={
                            <>
                                Master Mode{' '}
                                <Tooltip title="In master mode, you play both your moves and the opponent's moves. If you do not find the correct critical response(s) for the opponent, you will lose points.">
                                    <Help
                                        fontSize='small'
                                        sx={{ color: 'text.secondary', verticalAlign: 'middle' }}
                                    />
                                </Tooltip>
                            </>
                        }
                    /> */}
            </Stack>
        </Stack>
    );
}
