import { parsePgnDate, stripTagValue } from '@/api/gameApi';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { useChess } from '@/board/pgn/PgnBoard';
import { DirectorySelectButton } from '@/components/directories/select/DirectorySelectButton';
import { DirectoryCacheProvider } from '@/components/profile/directories/DirectoryCache';
import { GameResult, isGameResult } from '@/database/game';
import { MY_GAMES_DIRECTORY_ID } from '@jackstenglein/chess-dojo-common/src/database/directory';
import {
    CreateGameRequest,
    GameOrientations,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import {
    Button,
    Checkbox,
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
    Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers-pro';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';

interface FormError {
    white: string;
    black: string;
    date: string;
    result: string;
}

export interface SaveGameForm {
    white: string;
    black: string;
    date: DateTime | null;
    result: string;
    orientation: 'white' | 'black';
    publish?: boolean;
    skipFolder?: boolean;
}

export enum SaveGameDialogType {
    Save = 'save',
    Publish = 'publish',
}

interface SaveGameDialogProps {
    type: SaveGameDialogType;
    children?: React.ReactNode;
    loading?: boolean;
    open: boolean;
    title: string;
    createGameRequest?: CreateGameRequest | null;
    setCreateGameRequest?: (v: CreateGameRequest) => void;
    onClose: () => void;
    onSubmit: (details: SaveGameForm) => Promise<void>;
}

export default function SaveGameDialog({
    type,
    children,
    loading,
    open,
    title,
    createGameRequest,
    setCreateGameRequest,
    onClose,
    onSubmit,
}: SaveGameDialogProps) {
    const t = useTranslations('games.saveDialog');
    const isFreeTier = useFreeTier();
    const { chess, orientation: initialOrientation } = useChess();
    const initialTags = chess?.pgn.header.tags;

    const [selectedButton, setSelectedButton] = useState('');
    const [form, setForm] = useState<SaveGameForm>({
        white: initialTags?.White ?? '',
        black: initialTags?.Black ?? '',
        result: initialTags?.Result ?? '',
        date: parsePgnDate(initialTags?.Date?.value),
        orientation: initialOrientation ?? GameOrientations.white,
    });
    const [addToFolder, setAddToFolder] = useState(true);

    const [errors, setErrors] = useState<Partial<FormError>>({});

    function onChangeField(key: keyof SaveGameForm, value: string | DateTime | null): void {
        setForm((oldForm) => ({ ...oldForm, [key]: value }));
    }

    const submit = (publish?: boolean) => {
        const newErrors: Partial<FormError> = {};

        if (publish) {
            if (stripTagValue(form.white) === '') {
                newErrors.white = t('fieldRequired');
            }
            if (stripTagValue(form.black) === '') {
                newErrors.black = t('fieldRequired');
            }
            if (!isGameResult(form.result)) {
                newErrors.result = t('fieldRequired');
            }
            if (!form.date?.isValid) {
                newErrors.date = t('fieldRequired');
            }
        } else if (form.date && !form.date.isValid) {
            newErrors.date = t('invalidDate');
        }

        setErrors(newErrors);
        if (Object.values(newErrors).length > 0) {
            return;
        }

        setSelectedButton(publish ? 'publish' : 'save');
        void onSubmit({ ...form, skipFolder: !addToFolder, publish }).then(() =>
            setSelectedButton(''),
        );
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth='md'>
            <SaveGameDialogBody
                title={title}
                form={form}
                onChangeField={onChangeField}
                errors={errors}
                createGameRequest={createGameRequest}
                setCreateGameRequest={setCreateGameRequest}
                addToFolder={addToFolder}
                setAddToFolder={setAddToFolder}
            >
                {children}
            </SaveGameDialogBody>
            <DialogActions>
                <Button data-testid='cancel-preflight' onClick={onClose} disabled={loading}>
                    {t('cancel')}
                </Button>

                {type === SaveGameDialogType.Save && (
                    <Button
                        data-testid='save-dialogue-button'
                        onClick={() => submit(false)}
                        loading={loading && selectedButton === 'save'}
                        disabled={loading && selectedButton !== 'save'}
                    >
                        {t('save')}
                    </Button>
                )}

                {type === SaveGameDialogType.Save && isFreeTier ? (
                    <Tooltip title={t('freeUserTooltip')}>
                        <span>
                            <Button disabled>{t('saveAndPublish')}</Button>
                        </span>
                    </Tooltip>
                ) : (
                    <Button
                        data-testid='publish-dialogue-button'
                        onClick={() => submit(true)}
                        loading={loading && selectedButton === 'publish'}
                        disabled={loading && selectedButton !== 'publish'}
                    >
                        {type === SaveGameDialogType.Save ? t('saveAndPublish') : t('publish')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

function SaveGameDialogBody({
    title,
    children,
    form,
    onChangeField,
    errors,
    createGameRequest,
    setCreateGameRequest,
    addToFolder,
    setAddToFolder,
}: {
    title: string;
    children?: ReactNode;
    form: SaveGameForm;
    onChangeField: (key: keyof SaveGameForm, value: string | DateTime | null) => void;
    errors: Partial<FormError>;
    createGameRequest?: CreateGameRequest | null;
    setCreateGameRequest?: (v: CreateGameRequest) => void;
    addToFolder: boolean;
    setAddToFolder: (v: boolean) => void;
}) {
    const t = useTranslations('games.saveDialog');
    const { user } = useAuth();

    const onChangeDirectory = (directory: { owner: string; id: string }) => {
        if (createGameRequest && setCreateGameRequest) {
            setCreateGameRequest?.({ ...createGameRequest, directory });
        }
        return Promise.resolve(true);
    };

    return (
        <>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {children ? children : <>{t('reviewFields')}</>}
                </DialogContentText>

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
                                sm: 6,
                                md: 'grow',
                            }}
                        >
                            <TextField
                                fullWidth
                                data-testid='white'
                                label={t('whiteName')}
                                value={form.white}
                                onChange={(e) => onChangeField('white', e.target.value)}
                                error={!!errors.white}
                                helperText={errors.white}
                            />
                        </Grid>

                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 'grow',
                            }}
                        >
                            <TextField
                                fullWidth
                                data-testid='black'
                                label={t('blackName')}
                                value={form.black}
                                onChange={(e) => onChangeField('black', e.target.value)}
                                error={!!errors.black}
                                helperText={errors.black}
                            />
                        </Grid>

                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 2,
                            }}
                        >
                            <TextField
                                select
                                data-testid='result'
                                label={t('result')}
                                value={form.result}
                                onChange={(e) => onChangeField('result', e.target.value)}
                                error={!!errors.result}
                                helperText={errors.result}
                                fullWidth
                            >
                                <MenuItem value={GameResult.White}>{t('whiteWon')}</MenuItem>
                                <MenuItem value={GameResult.Draw}>{t('draw')}</MenuItem>
                                <MenuItem value={GameResult.Black}>{t('blackWon')}</MenuItem>
                                <MenuItem value={GameResult.Incomplete}>{t('analysis')}</MenuItem>
                            </TextField>
                        </Grid>

                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3,
                            }}
                        >
                            <DatePicker
                                label={t('date')}
                                disableFuture
                                value={form.date}
                                onChange={(newValue) => {
                                    onChangeField('date', newValue);
                                }}
                                slotProps={{
                                    textField: {
                                        id: 'date',
                                        error: !!errors.date,
                                        helperText: errors.date,
                                        fullWidth: true,
                                    },
                                }}
                            />
                        </Grid>

                        <Grid size={12}>
                            <FormControl>
                                <FormLabel>{t('defaultOrientation')}</FormLabel>
                                <RadioGroup
                                    row
                                    value={form.orientation}
                                    onChange={(e) => onChangeField('orientation', e.target.value)}
                                >
                                    <FormControlLabel
                                        value='white'
                                        control={<Radio />}
                                        label={t('white')}
                                    />
                                    <FormControlLabel
                                        value='black'
                                        control={<Radio />}
                                        label={t('black')}
                                    />
                                </RadioGroup>
                            </FormControl>
                        </Grid>

                        {createGameRequest && setCreateGameRequest && (
                            <Grid size={12}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={addToFolder}
                                            onChange={(e) => setAddToFolder(e.target.checked)}
                                        />
                                    }
                                    label={t('addToFolder')}
                                />
                                <DirectoryCacheProvider>
                                    <DirectorySelectButton
                                        initialDirectory={
                                            createGameRequest?.directory || {
                                                owner: user?.username || '',
                                                id: MY_GAMES_DIRECTORY_ID,
                                            }
                                        }
                                        showDirectoryName
                                        onSelect={onChangeDirectory}
                                        slotProps={{
                                            button: {
                                                disabled: !addToFolder,
                                            },
                                            dialog: {
                                                confirmButton: {
                                                    children: t('select'),
                                                },
                                            },
                                        }}
                                    />
                                </DirectoryCacheProvider>
                            </Grid>
                        )}
                    </Grid>
                </Stack>
            </DialogContent>
        </>
    );
}
