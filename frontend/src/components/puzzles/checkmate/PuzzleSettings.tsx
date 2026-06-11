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
        <Stack spacing={3} mb={3}>
            <Stack spacing={0.5}>
                <Typography variant='h5'>Puzzle Settings</Typography>

                {!solitaire?.complete && (
                    <Typography>
                        Some options can not be changed while in the middle of a puzzle.
                    </Typography>
                )}
            </Stack>

            <Stack>
                <MultipleSelectChip
                    label='Themes'
                    selected={themes}
                    setSelected={(v) => {
                        setThemes(v);
                        onChangeOptions();
                    }}
                    options={[
                        { value: 'mateIn1', label: 'Mate in 1' },
                        { value: 'mateIn2', label: 'Mate in 2' },
                        { value: 'mateIn3', label: 'Mate in 3' },
                    ]}
                    size='small'
                    sx={{ mb: 2.5 }}
                    disabled={!solitaire?.complete}
                />

                <TextField
                    label='Difficulty'
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
                    <MenuItem value='easiest'>Easiest (-600)</MenuItem>
                    <MenuItem value='easier'>Easier (-300)</MenuItem>
                    <MenuItem value='standard'>Standard (±200)</MenuItem>
                    <MenuItem value='harder'>Harder (+300)</MenuItem>
                    <MenuItem value='hardest'>Hardest (+600)</MenuItem>
                </TextField>

                <FormControlLabel
                    control={
                        <Checkbox checked={rated} onChange={(e) => setRated(e.target.checked)} />
                    }
                    label='Rated'
                    disabled={!solitaire?.complete}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showStreak}
                            onChange={(e) => setShowStreak(e.target.checked)}
                        />
                    }
                    label='Show Streak'
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showRating}
                            onChange={(e) => setShowRating(e.target.checked)}
                        />
                    }
                    label='Show Rating'
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showTimer}
                            onChange={(e) => setShowTimer(e.target.checked)}
                        />
                    }
                    label='Show Timer'
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={correctSound}
                            onChange={(e) => setCorrectSound(e.target.checked)}
                        />
                    }
                    label='Play sound on correct move'
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={incorrectSound}
                            onChange={(e) => setIncorrectSound(e.target.checked)}
                        />
                    }
                    label='Play sound on incorrect move'
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
