import { useChess } from '@/board/pgn/PgnBoard';
import {
    PlayAs,
    SOLITAIRE_DEFAULT_CORRECT_SOUND,
    SOLITAIRE_DEFAULT_INCORRECT_SOUND,
    SolitaireSound,
} from '@/board/pgn/solitaire/useSolitaireChess';
import {
    CORRECT_SOUND_KEY,
    INCORRECT_SOUND_KEY,
} from '@/components/puzzles/settings/puzzleSettingsKeys';
import {
    Alert,
    Button,
    CardContent,
    Checkbox,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

/**
 * Renders an underboard tab with miscellaneous tools. Currently, this
 * contains only the solitaire chess controls.
 */
export function Tools() {
    const t = useTranslations('analysisBoard.underboard.tools');
    const { chess, solitaire } = useChess();
    const [error, setError] = useState('');
    const [correctSound, setCorrectSound] = useLocalStorage(
        CORRECT_SOUND_KEY,
        SOLITAIRE_DEFAULT_CORRECT_SOUND,
    );
    const [incorrectSound, setIncorrectSound] = useLocalStorage(
        INCORRECT_SOUND_KEY,
        SOLITAIRE_DEFAULT_INCORRECT_SOUND,
    );

    const onStartFromMove = () => {
        if (chess?.currentMove() === chess?.lastMove()) {
            setError(t('cannotStartLastMoveError'));
            return;
        }
        if (!chess?.isInMainline()) {
            setError(t('cannotStartVariationError'));
            return;
        }
        solitaire?.start(chess.currentMove());
    };

    return (
        <CardContent>
            <Snackbar open={!!error} onClose={() => setError('')} autoHideDuration={4000}>
                <Alert severity='error' variant='filled'>
                    {error}
                </Alert>
            </Snackbar>

            <Stack>
                <Typography variant='h6'>{t('solitaireChessTitle')}</Typography>
                <Divider />
                <Typography
                    sx={{
                        mt: 1,
                    }}
                >
                    {t('solitaireChessDescription')}
                </Typography>

                <FormControl sx={{ mt: 2 }} disabled={solitaire?.enabled}>
                    <FormLabel>{t('playAsLabel')}</FormLabel>
                    <RadioGroup
                        row
                        value={solitaire?.playAs}
                        onChange={(e) => solitaire?.setPlayAs(e.target.value as PlayAs)}
                    >
                        <FormControlLabel
                            value='both'
                            control={<Radio />}
                            label={t('bothOption')}
                        />
                        <FormControlLabel
                            value='white'
                            control={<Radio />}
                            label={t('whiteOption')}
                        />
                        <FormControlLabel
                            value='black'
                            control={<Radio />}
                            label={t('blackOption')}
                        />
                    </RadioGroup>
                </FormControl>

                <FormControlLabel
                    label={t('addWrongMovesCheckbox')}
                    control={
                        <Checkbox
                            checked={solitaire?.addWrongMoves}
                            onChange={(e) => solitaire?.setAddWrongMoves(e.target.checked)}
                        />
                    }
                    sx={{ mt: 2 }}
                />

                <TextField
                    select
                    label={t('solitaire.correctSoundLabel')}
                    value={correctSound}
                    onChange={(e) => setCorrectSound(e.target.value as SolitaireSound)}
                    sx={{ my: 3 }}
                >
                    <MenuItem value={SolitaireSound.None}>{t('solitaire.none')}</MenuItem>
                    <MenuItem value={SolitaireSound.Bell}>{t('solitaire.bell')}</MenuItem>
                    <MenuItem value={SolitaireSound.Rising5th}>{t('solitaire.rising5th')}</MenuItem>
                    <MenuItem value={SolitaireSound.Rising6th}>{t('solitaire.rising6th')}</MenuItem>
                    <MenuItem value={SolitaireSound.WarmChord}>{t('solitaire.warmChord')}</MenuItem>
                    <MenuItem value={SolitaireSound.Boss}>{t('solitaire.boss')}</MenuItem>
                </TextField>

                <TextField
                    select
                    label={t('solitaire.incorrectSoundLabel')}
                    value={incorrectSound}
                    onChange={(e) => setIncorrectSound(e.target.value as SolitaireSound)}
                >
                    <MenuItem value={SolitaireSound.None}>{t('solitaire.none')}</MenuItem>
                    <MenuItem value={SolitaireSound.Buzz}>{t('solitaire.buzz')}</MenuItem>
                </TextField>

                {!solitaire?.enabled ? (
                    <Stack
                        direction='row'
                        sx={{
                            gap: 1,
                            flexWrap: 'wrap',
                            mt: 2,
                        }}
                    >
                        <Button onClick={() => solitaire?.start(null)}>
                            {t('startFromBeginningButton')}
                        </Button>
                        <Button onClick={onStartFromMove}>{t('startFromCurrentMoveButton')}</Button>
                    </Stack>
                ) : (
                    <Button onClick={solitaire.stop} sx={{ mt: 2 }}>
                        {t('exitSolitaireModeButton')}
                    </Button>
                )}
            </Stack>
        </CardContent>
    );
}
