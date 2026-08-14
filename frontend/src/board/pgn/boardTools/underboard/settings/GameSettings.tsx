import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { isMissingData, parsePgnDate, toPgnDate } from '@/api/gameApi';
import { useFreeTier } from '@/auth/Auth';
import { Game, PgnHeaders } from '@/database/game';
import { MissingGameDataPreflight } from '@/games/edit/MissingGameDataPreflight';
import DeleteGameButton from '@/games/view/DeleteGameButton';
import { useRouter } from '@/hooks/useRouter';
import {
    GameHeader,
    GameImportTypes,
    GameOrientation,
    GameOrientations,
    UpdateGameRequest,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import {
    Button,
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers-pro';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useChess } from '../../../PgnBoard';
import AnnotationWarnings from '../../../annotations/AnnotationWarnings';
import RequestReviewDialog from './RequestReviewDialog';

interface GameSettingsProps {
    game: Game;
    onSaveGame?: (g: Game) => void;
}

const GameSettings: React.FC<GameSettingsProps> = ({ game, onSaveGame }) => {
    const t = useTranslations('analysisBoard.underboard.settings');
    const initialVisibility = game.unlisted ? 'unlisted' : 'published';
    const initialOrientation = game.orientation ?? GameOrientations.white;

    const isFreeTier = useFreeTier();
    const [visibility, setVisibility] = useState(initialVisibility);
    const [orientation, setOrientation] = useState<GameOrientation>(initialOrientation);
    const [headers, setHeaders] = useState<PgnHeaders>(game.headers);
    const router = useRouter();

    useEffect(() => {
        setVisibility(initialVisibility);
        setOrientation(initialOrientation);
    }, [initialVisibility, initialOrientation, setVisibility, setOrientation]);

    const { White, Black, Date } = game.headers;
    const headersChanged = Object.entries({ White, Black, Date }).some(
        ([name, value]) => value !== headers[name],
    );

    const unlisted = visibility === 'unlisted';
    const dirty =
        headersChanged || orientation !== game.orientation || (game.unlisted ?? false) !== unlisted;

    const onChangeHeader = (name: string, value: string) => {
        setHeaders((oldHeaders) => ({ ...oldHeaders, [name]: value }));
    };

    return (
        <Stack spacing={5} mt={1}>
            <AnnotationWarnings />

            <Stack spacing={3}>
                <Typography variant='h5'>{t('gameSettingsTitle')}</Typography>

                <Stack spacing={2}>
                    <TextField
                        fullWidth
                        data-testid='white'
                        label={t('whitesNameLabel')}
                        value={headers.White}
                        onChange={(e) => onChangeHeader('White', e.target.value)}
                    />
                    <TextField
                        fullWidth
                        data-testid='black'
                        label={t('blacksNameLabel')}
                        value={headers.Black}
                        onChange={(e) => onChangeHeader('Black', e.target.value)}
                    />
                    <DatePicker
                        label={t('datePlayedLabel')}
                        value={parsePgnDate(headers.Date)}
                        onChange={(newValue) => {
                            onChangeHeader('Date', toPgnDate(newValue) ?? '');
                        }}
                        slotProps={{
                            textField: {
                                id: 'date',
                                fullWidth: true,
                            },
                            field: {
                                clearable: true,
                            },
                        }}
                    />

                    <FormControl>
                        <FormLabel>{t('defaultOrientationLabel')}</FormLabel>
                        <RadioGroup
                            row
                            value={orientation}
                            onChange={(e) => setOrientation(e.target.value as GameOrientation)}
                        >
                            <FormControlLabel
                                value={GameOrientations.white}
                                control={<Radio />}
                                label={t('whiteOrientationLabel')}
                            />
                            <FormControlLabel
                                value={GameOrientations.black}
                                control={<Radio />}
                                label={t('blackOrientationLabel')}
                            />
                        </RadioGroup>
                    </FormControl>

                    <FormControl disabled={isFreeTier}>
                        <FormLabel>{t('visibilityLabel')}</FormLabel>
                        <RadioGroup
                            row
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value)}
                        >
                            <FormControlLabel
                                value='published'
                                control={<Radio disabled={isFreeTier} />}
                                label={t('publishedLabel')}
                            />
                            <FormControlLabel
                                value='unlisted'
                                control={<Radio disabled={isFreeTier} />}
                                label={t('unlistedLabel')}
                            />
                        </RadioGroup>
                        {isFreeTier && (
                            <FormHelperText>{t('freeTierUnlistedOnlyMessage')}</FormHelperText>
                        )}
                    </FormControl>
                </Stack>
            </Stack>

            <Stack spacing={2}>
                <SaveGameButton
                    game={game}
                    dirty={dirty}
                    headersChanged={headersChanged}
                    headers={headers}
                    orientation={orientation}
                    unlisted={unlisted}
                    onSaveGame={(game) => {
                        setHeaders(game.headers);
                        onSaveGame?.(game);
                    }}
                />

                <RequestReviewDialog game={game} />

                <Button
                    variant='outlined'
                    onClick={() => router.push(`/games/${game.cohort}/${game.id}/edit`)}
                >
                    {t('replacePgnButton')}
                </Button>
                <DeleteGameButton
                    variant='contained'
                    games={[{ cohort: game.cohort, id: game.id }]}
                />
            </Stack>
        </Stack>
    );
};

interface SaveGameButtonProps {
    game: Game;
    unlisted: boolean;
    orientation: GameOrientation;
    headers: PgnHeaders;
    headersChanged: boolean;
    dirty: boolean;
    onSaveGame?: (g: Game) => void;
}

const SaveGameButton = ({
    game,
    unlisted,
    orientation,
    headers,
    headersChanged,
    dirty,
    onSaveGame,
}: SaveGameButtonProps) => {
    const t = useTranslations('analysisBoard.underboard.settings');
    const { chess } = useChess();
    const api = useApi();
    const request = useRequest();
    const [showPreflight, setShowPreflight] = useState<boolean>(false);
    const loading = request.isLoading();

    const isPublishing = (game.unlisted ?? false) && !unlisted;
    const needsPreflight = !unlisted && isMissingData({ ...game, headers });

    const onShowPreflight = () => {
        setShowPreflight(true);
    };

    const onClosePreflight = () => {
        setShowPreflight(false);
        request.reset();
    };

    const onSave = (newHeaders?: GameHeader, newOrientation?: GameOrientation) => {
        request.onStart();

        if (!newHeaders && headersChanged) {
            newHeaders = {
                white: headers.White || '?',
                black: headers.Black || '??',
                result: headers.Result,
                date: headers.Date,
            };
        }

        const update: Partial<UpdateGameRequest> = {
            type: newHeaders ? GameImportTypes.editor : undefined,
            cohort: game.cohort,
            id: game.id,
            updatedAt: game.updatedAt || game.createdAt || '',
            orientation: newOrientation || orientation,
            timelineId: game.timelineId,
        };

        if (isPublishing) {
            update.unlisted = false;
        } else if (!game.unlisted && unlisted) {
            update.unlisted = true;
        }

        if (newHeaders) {
            const pgnHeaders = {
                White: newHeaders.white,
                Black: newHeaders.black,
                Date: newHeaders.date,
            };

            for (const [name, value] of Object.entries(pgnHeaders)) {
                chess?.setHeader(name, value);
            }

            update.headers = newHeaders;
            update.pgnText = chess?.renderPgn();
        }

        api.updateGame(game.cohort, game.id, update)
            .then((resp) => {
                trackEvent(EventType.UpdateGame, {
                    method: 'settings',
                    dojo_cohort: game.cohort,
                });

                onSaveGame?.(resp.data);
                request.onSuccess();
                setShowPreflight(false);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <>
            <RequestSnackbar request={request} showSuccess />
            <Button
                variant='contained'
                disabled={!dirty}
                loading={loading}
                onClick={() => (needsPreflight ? onShowPreflight() : onSave())}
            >
                {isPublishing ? t('publishButton') : t('saveChangesButton')}
            </Button>
            <MissingGameDataPreflight
                open={showPreflight}
                onClose={onClosePreflight}
                initHeaders={headers}
                initOrientation={orientation}
                onSubmit={onSave}
                loading={loading}
            >
                {t('missingGameDataMessage')}
            </MissingGameDataPreflight>
        </>
    );
};

export default GameSettings;
