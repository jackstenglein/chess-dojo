'use client';

import ViewerSettings, {
    PieceSounds,
    ViewerSetting,
} from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import { Close } from '@mui/icons-material';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { useLocalStorage } from 'usehooks-ts';
import { PUZZLE_COORDINATE_SIZE, SOLVED_SOUND_KEY } from '../settings/puzzleSettingsKeys';
import {
    DEFAULT_SOLVED_SOUND,
    playSolvedSound,
    SOLVED_SOUNDS,
    SolvedSoundId,
} from '../settings/puzzleSounds';

/** The viewer settings that matter while solving puzzles. Engine and shortcut options do not. */
const BOARD_SETTINGS = {
    [ViewerSetting.BoardStyle]: true,
    [ViewerSetting.PieceStyle]: true,
    [ViewerSetting.CoordinateStyle]: true,
    [ViewerSetting.CoordinateSize]: true,
    [ViewerSetting.ShowLegalMoves]: true,
    [ViewerSetting.IncorrectSolitaireMoveSound]: true,
};

interface TrainerSettingsDialogProps {
    onClose: () => void;
}

/**
 * The trainer's settings: which sounds play, then the board, pieces and everything else the
 * analysis board lets you set. Changes apply at once and are remembered on this device.
 */
export function TrainerSettingsDialog({ onClose }: TrainerSettingsDialogProps) {
    const [sounds, setSounds] = useLocalStorage<boolean>(PieceSounds.key, PieceSounds.default);
    const [solved, setSolved] = useLocalStorage<SolvedSoundId>(
        SOLVED_SOUND_KEY,
        DEFAULT_SOLVED_SOUND,
    );

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth='sm' scroll='paper'>
            <DialogTitle sx={{ fontWeight: 'bold', pr: 7 }}>
                Settings
                <IconButton
                    aria-label='Close settings'
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 12, top: 12 }}
                >
                    <Close />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack sx={{ gap: 4 }}>
                    <Stack sx={{ gap: 2 }}>
                        <Typography variant='h6'>Sounds</Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={sounds}
                                    onChange={(e) => setSounds(e.target.checked)}
                                />
                            }
                            label='Play sounds'
                        />
                        <SoundSelect
                            label='When a puzzle is solved'
                            value={solved}
                            options={SOLVED_SOUNDS}
                            onChange={setSolved}
                            onPlay={playSolvedSound}
                        />
                    </Stack>

                    <Stack sx={{ gap: 2 }}>
                        <Typography variant='h6'>Board and pieces</Typography>
                        <ViewerSettings
                            compact
                            enabledSettings={BOARD_SETTINGS}
                            defaultCoordinateSize={PUZZLE_COORDINATE_SIZE}
                        />
                    </Stack>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}

interface SoundSelectProps<Id extends string> {
    label: string;
    value: Id;
    options: { id: Id; label: string }[];
    onChange: (id: Id) => void;
    /** Plays the sound that was just picked. */
    onPlay: (id: Id) => void;
}

/** A menu of sounds. Picking one plays it. */
function SoundSelect<Id extends string>({
    label,
    value,
    options,
    onChange,
    onPlay,
}: SoundSelectProps<Id>) {
    return (
        <TextField
            select
            label={label}
            value={value}
            onChange={(e) => {
                const id = e.target.value as Id;
                onChange(id);
                onPlay(id);
            }}
        >
            {options.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                    {option.label}
                </MenuItem>
            ))}
        </TextField>
    );
}
