import { EventType, trackEvent } from '@/analytics/events';
import { axiosService } from '@/api/axiosService';
import { RequestSnackbar, useRequest } from '@/api/Request';
import Board from '@/board/Board';
import { getLigaIconBasedOnTimeControl } from '@/components/calendar/eventViewer/LigaTournamentViewer';
import { PlayMaiaDialog } from '@/components/playbot/PlayMaiaDialog';
import { Position as PositionModel } from '@/database/requirement';
import Icon from '@/style/Icon';
import { Biotech, Close as CloseIcon, SmartDisplay, SmartToy } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import copy from 'copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { SiChessdotcom } from 'react-icons/si';

export function turnColor(fen: string): 'white' | 'black' {
    const turn = fen.split(' ')[1];
    if (turn === 'b') {
        return 'black';
    }
    return 'white';
}

interface PositionProps {
    position: PositionModel;
    orientation?: 'white' | 'black';
}

const Position = ({ position, orientation }: PositionProps) => {
    const t = useTranslations('profile.trainingPlan.position');
    const [copied, setCopied] = useState('');
    const lichessRequest = useRequest();
    const playComputerAnchor = useRef<HTMLButtonElement>(null);
    const [playComputerOpen, setPlayComputerOpen] = useState(false);
    const [videoOpen, setVideoOpen] = useState(false);
    const [playMaiaOpen, setPlayMaiaOpen] = useState(false);

    const onCopy = (name: string) => {
        setCopied(name);
        setTimeout(() => {
            setCopied('');
        }, 3000);
    };

    const onCopyFen = (fen: string) => {
        copy(fen);
        trackEvent(EventType.CopyFen, {
            position_fen: position.fen.trim(),
            position_name: position.title,
        });
        onCopy('fen');
    };

    const generateLichessUrl = () => {
        lichessRequest.onStart();
        axiosService
            .post<{ url: string }>('https://lichess.org/api/challenge/open', {
                'clock.limit': position.limitSeconds,
                'clock.increment': position.incrementSeconds,
                fen: position.fen.trim(),
                name: position.title,
            })
            .then((resp) => {
                trackEvent(EventType.CreateSparringLink, {
                    position_fen: position.fen.trim(),
                    position_name: position.title,
                    clock_limit: position.limitSeconds,
                    clock_increment: position.incrementSeconds,
                });
                lichessRequest.onSuccess();
                copy(resp.data.url);
                onCopy('lichess');
            })
            .catch((err) => {
                lichessRequest.onFailure(err);
            });
    };

    const turn = turnColor(position.fen);

    const timeControlName = getLigaIconBasedOnTimeControl(position.limitSeconds) ?? 'unknown';

    return (
        <Card variant='outlined' sx={{ px: 0, maxWidth: '386px' }}>
            <RequestSnackbar request={lichessRequest} />

            <CardHeader
                sx={{ px: 1 }}
                subheader={
                    <Stack
                        sx={{
                            px: 1,
                        }}
                    >
                        <Stack
                            direction='row'
                            sx={{
                                justifyContent: 'space-between',
                            }}
                        >
                            <Typography variant='h6'> {position.title}</Typography>
                            <Tooltip title={timeControlName.toLowerCase().concat(' time control')}>
                                <Typography>
                                    <Icon
                                        name={getLigaIconBasedOnTimeControl(position.limitSeconds)}
                                        color='dojoOrange'
                                        sx={{
                                            marginRight: '0.3',
                                            verticalAlign: 'middle',
                                        }}
                                    />{' '}
                                    {position.limitSeconds / 60}+{position.incrementSeconds}
                                </Typography>
                            </Tooltip>
                        </Stack>

                        <Stack
                            direction='row'
                            sx={{
                                justifyContent: 'space-between',
                            }}
                        >
                            <Typography
                                variant='body1'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                {position.result
                                    ? t('toPlayAndResult', {
                                          color: turn,
                                          result: position.result.toLocaleLowerCase(),
                                      })
                                    : t('toPlay', { color: turn })}
                            </Typography>
                        </Stack>
                    </Stack>
                }
            />
            <CardContent sx={{ pt: 0, px: 1 }}>
                <Box sx={{ aspectRatio: '1 / 1' }}>
                    <Board
                        config={{
                            fen: position.fen.trim(),
                            viewOnly: true,
                            orientation: orientation || turn,
                        }}
                    />
                </Box>
            </CardContent>
            <CardActions disableSpacing sx={{ flexWrap: 'wrap', columnGap: 1 }}>
                <Tooltip title={t('copyFenTooltip')}>
                    <Button
                        data-testid='position-fen-copy'
                        startIcon={
                            copied === 'fen' ? (
                                <CheckIcon color='success' />
                            ) : (
                                <ContentPasteIcon color='dojoOrange' />
                            )
                        }
                        onClick={() => onCopyFen(position.fen.trim())}
                    >
                        {t('fenButton')}
                    </Button>
                </Tooltip>

                <Tooltip title={t('openAnalysisTooltip')}>
                    <Button
                        startIcon={<Biotech color='dojoOrange' />}
                        href={`/games/explorer?fen=${position.fen}`}
                        rel='noopener'
                        target='_blank'
                    >
                        {t('analysisButton')}
                    </Button>
                </Tooltip>

                <Tooltip title={t('challengeUrlTooltip')}>
                    <Button
                        data-testid='position-challenge-url'
                        startIcon={
                            copied === 'lichess' ? (
                                <CheckIcon color='success' />
                            ) : (
                                <Icon name='spar' color='dojoOrange' />
                            )
                        }
                        loading={lichessRequest.isLoading()}
                        onClick={generateLichessUrl}
                    >
                        {t('challengeUrlButton')}
                    </Button>
                </Tooltip>

                <Tooltip title={t('playComputerTooltip')}>
                    <Button
                        ref={playComputerAnchor}
                        startIcon={<SiChessdotcom size={20} color='#81b64c' />}
                        onClick={() => setPlayComputerOpen(true)}
                    >
                        {t('playComputerButton')}
                    </Button>
                </Tooltip>

                <Tooltip title='Play this position against Maia, a neural network which is trained on human games'>
                    <Button
                        startIcon={<SmartToy color='primary' />}
                        onClick={() => setPlayMaiaOpen(true)}
                    >
                        Play Bot
                    </Button>
                </Tooltip>
                {position.videoUrl && (
                    <Tooltip title='Watch the video for this position'>
                        <Button
                            data-testid='position-video'
                            startIcon={<SmartDisplay sx={{ color: '#e00000' }} />}
                            onClick={() => setVideoOpen(true)}
                        >
                            Video
                        </Button>
                    </Tooltip>
                )}

                <Menu
                    open={playComputerOpen}
                    onClose={() => setPlayComputerOpen(false)}
                    anchorEl={playComputerAnchor.current}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <MenuItem
                        component='a'
                        href={`https://www.chess.com/practice/custom?fen=${position.fen}&is960=false`}
                        target='_blank'
                        rel='noopener'
                    >
                        {t('playAsWhite')}
                    </MenuItem>
                    <MenuItem
                        component='a'
                        href={`https://www.chess.com/practice/custom?fen=${position.fen}&is960=false&color=black`}
                        target='_blank'
                        rel='noopener'
                    >
                        {t('playAsBlack')}
                    </MenuItem>
                </Menu>
            </CardActions>

            <PlayMaiaDialog
                open={playMaiaOpen}
                onClose={() => setPlayMaiaOpen(false)}
                fen={position.fen.trim()}
                limitSeconds={position.limitSeconds}
                incrementSeconds={position.incrementSeconds}
                positionTitle={position.title}
                playerColor={turnColor(position.fen)}
            />
            {position.videoUrl && (
                <Dialog
                    open={videoOpen}
                    onClose={() => setVideoOpen(false)}
                    maxWidth='md'
                    fullWidth
                >
                    <DialogTitle
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                        }}
                    >
                        <Typography variant='h6' component='span'>
                            {position.title}
                        </Typography>
                        <IconButton
                            aria-label='close'
                            onClick={() => setVideoOpen(false)}
                            size='small'
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ width: 1, aspectRatio: '1.77' }}>
                            <iframe
                                src={position.videoUrl}
                                title={`${position.title} video`}
                                allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                                allowFullScreen
                                style={{ width: '100%', height: '100%', border: 0 }}
                            />
                        </Box>
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
};

export default Position;
