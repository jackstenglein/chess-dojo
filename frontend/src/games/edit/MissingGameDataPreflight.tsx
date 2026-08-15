import {
    GameHeader,
    GameOrientation,
    GameOrientations,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    MenuItem,
    Radio,
    RadioGroup,
    Stack,
    TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers-pro';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { parsePgnDate, stripTagValue, toPgnDate } from '../../api/gameApi';
import { GameResult, PgnHeaders, isGameResult } from '../../database/game';

interface FormHeader {
    white: string;
    black: string;
    date: DateTime | null;
    result: string;
}

function getFormHeader(h?: PgnHeaders): FormHeader {
    const result = h?.Result ?? '';

    return {
        result,
        date: parsePgnDate(h?.Date),
        white: stripTagValue(h?.White || ''),
        black: stripTagValue(h?.Black || ''),
    };
}

export function getGameHeaders(h: FormHeader): GameHeader {
    return {
        date: toPgnDate(h.date) ?? '',
        white: h.white,
        black: h.black,
        result: h.result,
    };
}

interface FormError {
    white: string;
    black: string;
    date: string;
    result: string;
}

interface MissingGameDataPreflightProps {
    open: boolean;
    onClose: () => void;
    initHeaders?: PgnHeaders;
    initOrientation?: GameOrientation;
    loading: boolean;
    title?: string;
    skippable?: boolean;
    children?: React.ReactNode;
    onSubmit: (headers: GameHeader, orientation: GameOrientation) => void;
}

export const MissingGameDataPreflight = ({
    open,
    onClose,
    initHeaders,
    initOrientation,
    loading,
    skippable,
    title,
    children,
    onSubmit,
}: MissingGameDataPreflightProps) => {
    const t = useTranslations('games.missingDataPreflight');
    const [headers, setHeaders] = useState<FormHeader>(getFormHeader(initHeaders));
    const [errors, setErrors] = useState<Partial<FormError>>({});
    const [orientation, setOrientation] = useState<GameOrientation>(
        initOrientation ?? GameOrientations.white,
    );

    if (skippable === undefined) {
        skippable = false;
    }

    const displayTitle = title ?? t('defaultTitle');

    useEffect(() => {
        setHeaders(getFormHeader(initHeaders));
    }, [initHeaders]);

    const onChangeHeader = (key: keyof GameHeader, value: string | DateTime | null) => {
        setHeaders((oldHeaders) => ({ ...oldHeaders, [key]: value }));
    };

    const submit = () => {
        const newErrors: Partial<FormError> = {};

        if (!skippable) {
            if (stripTagValue(headers.white) === '') {
                newErrors.white = t('fieldRequired');
            }
            if (stripTagValue(headers.black) === '') {
                newErrors.black = t('fieldRequired');
            }
            if (!isGameResult(headers.result)) {
                newErrors.result = t('fieldRequired');
            }
            if (!headers.date?.isValid) {
                newErrors.date = t('fieldRequired');
            }
        }

        setErrors(newErrors);
        if (Object.values(newErrors).length > 0) {
            return;
        }

        onSubmit(getGameHeaders(headers), orientation);
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth='lg'>
            <DialogTitle>{displayTitle}</DialogTitle>
            <DialogContent>
                {children && <DialogContentText>{children}</DialogContentText>}

                <Stack
                    spacing={3}
                    sx={{
                        mt: 3,
                    }}
                >
                    <Grid container columnSpacing={1} rowSpacing={2}>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 'grow',
                            }}
                        >
                            <TextField
                                fullWidth
                                data-testid='white'
                                label={t('whiteNameLabel')}
                                value={headers.white}
                                onChange={(e) => onChangeHeader('white', e.target.value)}
                                error={!!errors.white}
                                helperText={errors.white}
                            />
                        </Grid>

                        <Grid
                            size={{
                                xs: 12,
                                sm: 'grow',
                            }}
                        >
                            <TextField
                                fullWidth
                                data-testid='black'
                                label={t('blackNameLabel')}
                                value={headers.black}
                                onChange={(e) => onChangeHeader('black', e.target.value)}
                                error={!!errors.black}
                                helperText={errors.black}
                            />
                        </Grid>

                        <Grid
                            size={{
                                xs: 12,
                                sm: 'grow',
                            }}
                        >
                            <TextField
                                select
                                data-testid='result'
                                label={t('gameResultLabel')}
                                value={headers.result.replaceAll('*', '')}
                                onChange={(e) => onChangeHeader('result', e.target.value)}
                                error={!!errors.result}
                                helperText={errors.result}
                                fullWidth
                            >
                                <MenuItem value={GameResult.White}>
                                    {t('gameResultWhiteWon')}
                                </MenuItem>
                                <MenuItem value={GameResult.Draw}>{t('gameResultDraw')}</MenuItem>
                                <MenuItem value={GameResult.Black}>
                                    {t('gameResultBlackWon')}
                                </MenuItem>
                            </TextField>
                        </Grid>

                        <Grid
                            size={{
                                xs: 12,
                                sm: 'grow',
                            }}
                        >
                            <DatePicker
                                label={t('dateLabel')}
                                disableFuture
                                value={headers.date}
                                onChange={(newValue) => {
                                    onChangeHeader('date', newValue);
                                }}
                                slotProps={{
                                    textField: {
                                        id: 'date',
                                        error: !!errors.date,
                                        helperText: errors.date,
                                        fullWidth: true,
                                    },
                                    field: {
                                        clearable: true,
                                    },
                                }}
                            />
                        </Grid>

                        <Grid size={12}>
                            <FormControl>
                                <FormLabel>{t('defaultOrientationLabel')}</FormLabel>
                                <RadioGroup
                                    row
                                    value={orientation}
                                    onChange={(e) =>
                                        setOrientation(e.target.value as GameOrientation)
                                    }
                                >
                                    <FormControlLabel
                                        value={GameOrientations.white}
                                        control={<Radio />}
                                        label={t('orientationWhite')}
                                    />
                                    <FormControlLabel
                                        value={GameOrientations.black}
                                        control={<Radio />}
                                        label={t('orientationBlack')}
                                    />
                                </RadioGroup>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button data-testid='cancel-preflight' onClick={onClose} disabled={loading}>
                    {skippable ? t('skipForNow') : t('cancel')}
                </Button>
                <Button data-testid='submit-preflight' onClick={submit} loading={loading}>
                    {t('submit')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
