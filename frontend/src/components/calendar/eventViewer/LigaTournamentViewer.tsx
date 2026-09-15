import Board from '@/board/Board';
import { Event, displayTournamentType } from '@/database/event';
import Icon, { IconName } from '@/style/Icon';
import { ProcessedEvent } from '@jackstenglein/react-scheduler/types';
import { Box, Link, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function getLigaIconBasedOnTimeControl(timeControl: number): IconName | undefined {
    const tc = timeControl / 60;

    if (tc >= 1 && tc <= 9) {
        return 'Blitz';
    } else if (tc >= 10 && tc < 60) {
        return 'Rapid';
    } else if (tc >= 60 && tc <= 180) {
        return 'Classical';
    }

    return undefined;
}

interface LigaTournamentViewerProps {
    processedEvent: ProcessedEvent;
}

const LigaTournamentViewer: React.FC<LigaTournamentViewerProps> = ({ processedEvent }) => {
    const t = useTranslations('calendar');
    const labelT = useTranslations('eventLabels');
    const [displayPosition, setDisplayPosition] = useState(false);

    useEffect(() => {
        setTimeout(() => {
            setDisplayPosition(true);
        }, 250);
    }, [setDisplayPosition]);

    const event = processedEvent.event as Event;
    const ligaTournament = event.ligaTournament;
    if (!ligaTournament) {
        return null;
    }

    return (
        <Stack sx={{ py: 2 }} spacing={2}>
            <Typography variant='body1'>
                {t('ratedTypeHeader', {
                    rated: ligaTournament.rated ? 'true' : 'false',
                    tournamentType: displayTournamentType(ligaTournament.type, labelT),
                })}
            </Typography>

            {event.location && (
                <Stack>
                    <Typography
                        variant='h6'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        <Icon
                            name='location'
                            color='primary'
                            sx={{ marginRight: '0.5rem', verticalAlign: 'middle' }}
                        />
                        {t('location')}
                    </Typography>
                    <Link variant='body1' href={event.location} target='_blank' rel='noreferrer'>
                        {event.location}
                    </Link>
                </Stack>
            )}

            {event.description && (
                <Stack>
                    <Typography
                        variant='h6'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        <Icon
                            name='notes'
                            color='primary'
                            sx={{ marginRight: '0.5rem', verticalAlign: 'middle' }}
                        />
                        {t('description')}
                    </Typography>
                    <Typography variant='body1' style={{ whiteSpace: 'pre-line' }}>
                        {event.description}
                    </Typography>
                </Stack>
            )}

            <Stack>
                <Typography
                    variant='h6'
                    sx={{
                        color: 'text.secondary',
                    }}
                >
                    <Icon
                        name={getLigaIconBasedOnTimeControl(ligaTournament.limitSeconds)}
                        color='primary'
                        sx={{ marginRight: '0.5rem', verticalAlign: 'middle' }}
                    />
                    {t('timeControlLabel')}
                </Typography>
                <Typography variant='body1'>
                    {ligaTournament.limitSeconds / 60}+{ligaTournament.incrementSeconds}
                </Typography>
            </Stack>

            {ligaTournament.numRounds && (
                <Stack>
                    <Typography
                        variant='subtitle2'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {ligaTournament.currentRound ? t('roundSingular') : t('roundPlural')}
                    </Typography>
                    <Typography variant='body1'>
                        {ligaTournament.currentRound
                            ? `${ligaTournament.currentRound}/${ligaTournament.numRounds}`
                            : ligaTournament.numRounds}
                    </Typography>
                </Stack>
            )}

            {ligaTournament.fen && (
                <Stack>
                    <Typography
                        variant='subtitle2'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('positionLabel')}
                    </Typography>
                    <Box
                        sx={{
                            px: 0,
                            width: 1,
                            aspectRatio: 1,
                        }}
                    >
                        {displayPosition && (
                            <Board
                                config={{
                                    fen: ligaTournament.fen.trim(),
                                    viewOnly: true,
                                }}
                                onInitialize={(board) => board.redrawAll()}
                            />
                        )}
                    </Box>
                </Stack>
            )}
        </Stack>
    );
};

export default LigaTournamentViewer;
