import {
    OnlineGame,
    OnlineGameResultReason,
    OnlineGameTimeClass,
    OnlineGameTimeControl,
    useOnlineGames,
} from '@/api/external/onlineGame';
import {
    isChesscomAnalysisURL,
    isChesscomEventsUrl,
    isChesscomGameURL,
    isLichessChapterURL,
    isLichessGameURL,
    isLichessStudyURL,
} from '@/api/gameApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import {
    getChesscomAnalysis,
    getChesscomEvent,
    getChesscomGame,
    getLichessChapter,
    getLichessGame,
    PgnImportResult,
} from '@/app/(scoreboard)/games/analysis/server';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { RenderPlayers } from '@/components/games/list/GameListItem';
import { Link } from '@/components/navigation/Link';
import { isCohortInRange, RatingSystem } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { logger } from '@/logging/logger';
import {
    GameImportTypes,
    OnlineGameImportType,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import {
    Backdrop,
    Button,
    Card,
    CardActionArea,
    CardContent,
    DialogContent,
    DialogTitle,
    Grid,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { SiChessdotcom, SiLichess } from 'react-icons/si';
import { ImportButton } from './ImportButton';
import { ImportDialogProps } from './ImportWizard';
import { OrDivider } from './OrDivider';

function timeControlMatches(
    cohort: string | undefined,
    timeControl: OnlineGameTimeControl,
): boolean {
    if (!cohort) {
        return false;
    }

    const initialMinutes = timeControl.initialSeconds / 60;
    if (initialMinutes < 30) {
        return false;
    }
    const totalTime = initialMinutes + timeControl.incrementSeconds;

    if (isCohortInRange(cohort, '0-800')) {
        return totalTime >= 30;
    }
    if (isCohortInRange(cohort, '800-1200')) {
        return totalTime >= 60;
    }
    if (isCohortInRange(cohort, '1200-1600')) {
        return totalTime >= 75;
    }
    if (isCohortInRange(cohort, '1600-2000')) {
        return totalTime >= 90;
    }
    return totalTime >= 120;
}

const RecentGameCell = ({
    game,
    onClick,
}: {
    game: OnlineGame;
    onClick: (game: OnlineGame) => void;
}) => {
    const { user } = useAuth();

    const createdAt = new Date(game.endTime);
    const dateStr = toDojoDateString(createdAt, user?.timezoneOverride);
    const timeStr = toDojoTimeString(createdAt, user?.timezoneOverride, user?.timeFormat);

    return (
        <Card sx={{ height: 1 }}>
            <CardActionArea
                data-testid={`recent-game-${game.source}`}
                onClick={() => {
                    onClick(game);
                }}
                sx={{ height: 1 }}
            >
                <CardContent>
                    <Stack spacing={1.125}>
                        <Stack
                            direction='row'
                            spacing={1}
                            alignItems='center'
                            flexWrap='wrap'
                            justifyContent='space-between'
                        >
                            <Stack direction='row' alignItems='center' spacing={1}>
                                {game.source === GameImportTypes.lichessGame ? (
                                    <SiLichess />
                                ) : (
                                    <SiChessdotcom />
                                )}

                                <Typography variant='body2'>
                                    {dateStr} {timeStr}
                                </Typography>
                            </Stack>

                            <Typography
                                variant='body2'
                                color={
                                    timeControlMatches(user?.dojoCohort, game.timeControl)
                                        ? 'success.main'
                                        : undefined
                                }
                            >
                                {game.timeClass === OnlineGameTimeClass.Daily
                                    ? 'daily'
                                    : `${game.timeControl.initialSeconds / 60} | ${game.timeControl.incrementSeconds}`}
                            </Typography>
                        </Stack>
                        <Stack>
                            <RenderPlayers
                                white={game.white.username}
                                whiteElo={game.white.rating}
                                whiteProvisional={game.white.provisional}
                                black={game.black.username}
                                blackElo={game.black.rating}
                                blackProvisional={game.black.provisional}
                            />
                        </Stack>
                        <Typography variant='body2'>
                            {game.result}{' '}
                            {game.resultReason !== OnlineGameResultReason.Unknown &&
                                `by ${game.resultReason}`}
                        </Typography>
                    </Stack>
                </CardContent>
            </CardActionArea>
        </Card>
    );
};

const RecentGameGrid = ({
    games,
    onClickGame,
}: {
    games: OnlineGame[];
    onClickGame: (game: OnlineGame) => void;
}) => {
    return (
        <Grid container spacing={{ xs: 1, sm: 2 }}>
            {games.map((game) => (
                <Grid
                    key={game.id}
                    size={{
                        xs: 12,
                        sm: 6,
                    }}
                >
                    <RecentGameCell onClick={onClickGame} game={game} />
                </Grid>
            ))}
        </Grid>
    );
};

export const OnlineGameForm = ({ loading, onSubmit, onClose }: ImportDialogProps) => {
    const { user } = useAuth();
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const request = useRequest();

    const lichessUsername = user?.ratings?.[RatingSystem.Lichess]?.username;
    const chesscomUsername = user?.ratings?.[RatingSystem.Chesscom]?.username;
    const fetchGames = Boolean(lichessUsername || chesscomUsername);

    const {
        games,
        requests: { lichess, chesscom },
    } = useOnlineGames({ lichess: lichessUsername, chesscom: chesscomUsername });

    const handleSubmit = () => {
        if (url.trim() === '') {
            let err = 'URL is required';
            if (games.length > 0) {
                err += ' or select a game below';
            }

            setError(err);
            return;
        }

        const importMethods: [
            OnlineGameImportType,
            (url: string) => boolean,
            ((url: string) => Promise<PgnImportResult<string>>) | null,
        ][] = [
            [GameImportTypes.lichessChapter, isLichessChapterURL, getLichessChapter],
            [
                GameImportTypes.lichessStudy,
                isLichessStudyURL,
                null, // TODO, handle this case
            ],
            [GameImportTypes.lichessGame, isLichessGameURL, getLichessGame],
            [GameImportTypes.chesscomGame, isChesscomGameURL, getChesscomGame],
            [GameImportTypes.chesscomAnalysis, isChesscomAnalysisURL, getChesscomAnalysis],
            [GameImportTypes.chesscomGame, isChesscomEventsUrl, getChesscomEvent],
        ];

        // Import
        for (const [submissionType, match, importPgn] of importMethods) {
            if (!match(url)) {
                continue;
            }

            if (importPgn === null) {
                onSubmit({ url, type: submissionType });
            } else {
                importPgn(url)
                    .then(({ data: pgnText, error }) => {
                        if (error) {
                            logger.error?.(error.privateMessage);
                            request.onFailure(error.publicMessage);
                            return;
                        }
                        onSubmit({ pgnText: pgnText ?? '', type: 'manual' });
                    })
                    .catch(() => request.onFailure('Unexpected server error'));
            }

            return;
        }

        setError('The provided URL is unsupported. Please make sure it is correct.');
    };

    const onClickGame = (game: OnlineGame) => {
        onSubmit({ pgnText: game.pgn, type: game.source, url: game.url });
    };

    return (
        <>
            <DialogTitle>Import Online Game</DialogTitle>
            <DialogContent sx={{ height: fetchGames ? '75vh' : undefined }}>
                <Stack>
                    <TextField
                        data-testid='online-game-url'
                        label='Lichess or Chess.com URL'
                        placeholder='https://lichess.org/study/abcd1234/abcd1234'
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value);
                        }}
                        error={!!error}
                        helperText={error}
                        fullWidth
                        sx={{ mt: 0.8 }}
                    />
                    <Stack
                        alignSelf='flex-end'
                        direction='row'
                        spacing={1}
                        paddingRight={1}
                        paddingTop={1}
                    >
                        <Button disabled={loading || request.isLoading()} onClick={onClose}>
                            Cancel
                        </Button>
                        <ImportButton
                            loading={loading || request.isLoading()}
                            onClick={handleSubmit}
                        />
                    </Stack>
                    <OrDivider header='Recent Games' />
                    {fetchGames ? (
                        loading ||
                        request.isLoading() ||
                        chesscom.isLoading() ||
                        lichess.isLoading() ? (
                            <LoadingPage />
                        ) : (
                            <>
                                <Backdrop
                                    open={loading}
                                    sx={{
                                        color: '#fff',
                                        zIndex: (theme) => theme.zIndex.tooltip + 1,
                                    }}
                                >
                                    <LoadingPage />
                                </Backdrop>
                                <RecentGameGrid games={games} onClickGame={onClickGame} />
                            </>
                        )
                    ) : (
                        <Typography variant='body2'>
                            To list recent games, add your Chess.com or Lichess username to your{' '}
                            <Link href='/profile/edit#ratings'>profile</Link>.
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <RequestSnackbar request={request} />
        </>
    );
};
