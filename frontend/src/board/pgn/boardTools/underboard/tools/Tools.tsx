import { useChess } from '@/board/pgn/PgnBoard';
import { PlayAs } from '@/board/pgn/solitaire/useSolitaireChess';
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
    Radio,
    RadioGroup,
    Snackbar,
    Stack,
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
    const [correctSound, setCorrectSound] = useLocalStorage(CORRECT_SOUND_KEY, true);
    const [incorrectSound, setIncorrectSound] = useLocalStorage(INCORRECT_SOUND_KEY, true);

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

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={correctSound}
                            onChange={(e) => setCorrectSound(e.target.checked)}
                        />
                    }
                    label={t('correctSoundCheckbox')}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={incorrectSound}
                            onChange={(e) => setIncorrectSound(e.target.checked)}
                        />
                    }
                    label={t('incorrectSoundCheckbox')}
                />

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
