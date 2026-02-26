import { EventType, trackEvent } from '@/analytics/events';
import { axiosService } from '@/api/axiosService';
import { RequestSnackbar, useRequest } from '@/api/Request';
import Board from '@/board/Board';
import { getLigaIconBasedOnTimeControl } from '@/components/calendar/eventViewer/LigaTournamentViewer';
import { Position as PositionModel } from '@/database/requirement';
import Icon from '@/style/Icon';
import { Biotech } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { LoadingButton } from '@mui/lab';
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Menu,
    MenuItem,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import copy from 'copy-to-clipboard';
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
    const [copied, setCopied] = useState('');
    const lichessRequest = useRequest();
    const playComputerAnchor = useRef<HTMLButtonElement>(null);
    const [playComputerOpen, setPlayComputerOpen] = useState(false);

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
                    <Stack px={1}>
                        <Stack direction='row' justifyContent='space-between'>
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

                        <Stack direction='row' justifyContent='space-between'>
                            <Typography variant='body1' color='text.secondary'>
                                {turn[0].toLocaleUpperCase() + turn.slice(1)} to play
                                {position.result && ` and ${position.result.toLocaleLowerCase()}`}
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
                <Tooltip title='Copy position FEN to clipboard'>
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
                        FEN
                    </Button>
                </Tooltip>

                <Tooltip title='Open in analysis board'>
                    <Button
                        startIcon={<Biotech color='dojoOrange' />}
                        href={`/games/explorer?fen=${position.fen}`}
                        rel='noopener'
                        target='_blank'
                    >
                        Analysis
                    </Button>
                </Tooltip>

                <Tooltip title='Copy a URL and send to another player to play on Lichess'>
                    <LoadingButton
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
                        Challenge URL
                    </LoadingButton>
                </Tooltip>

                <Tooltip title='Play against computer on Chess.com'>
                    <Button
                        ref={playComputerAnchor}
                        startIcon={<SiChessdotcom size={20} color='#81b64c' />}
                        onClick={() => setPlayComputerOpen(true)}
                    >
                        Play Computer
                    </Button>
                </Tooltip>

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
                        Play as white
                    </MenuItem>
                    <MenuItem
                        component='a'
                        href={`https://www.chess.com/practice/custom?fen=${position.fen}&is960=false&color=black`}
                        target='_blank'
                        rel='noopener'
                    >
                        Play as black
                    </MenuItem>
                </Menu>
            </CardActions>
        </Card>
    );
};

export default Position;
