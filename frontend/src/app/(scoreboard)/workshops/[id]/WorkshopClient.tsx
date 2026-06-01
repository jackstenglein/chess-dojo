'use client';

import { Link } from '@/components/navigation/Link';
import { Workshop } from '@/database/workshop';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Button, Container, Divider, Grid, Paper, Stack, Typography } from '@mui/material';
import React, { useState } from 'react';
import WorkshopVideoPlayer from './WorkshopVideoPlayer';

/**
 * Client component handling the interactive UI for workshops.
 * @param {{ workshop: Workshop }} props
 * @returns {React.JSX.Element}
 */
export default function WorkshopClient({ workshop }: { workshop: Workshop }): React.JSX.Element {
    const [isPurchased, setIsPurchased] = useState(false);
    const [activeRecording, setActiveRecording] = useState(workshop.recordings[0]);

    if (!isPurchased) {
        return (
            <Container maxWidth='xl' sx={{ py: 5 }}>
                <Stack sx={{ mb: 4 }}>
                    <Typography variant='h4'>{workshop.name}</Typography>
                    <Typography color='text.secondary' variant='h5'>
                        {workshop.cohortRange}
                    </Typography>
                    <Divider sx={{ mt: 2 }} />
                </Stack>

                <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                        <Typography sx={{ mb: 4, whiteSpace: 'pre-wrap' }} variant='body1'>
                            {workshop.description}
                        </Typography>

                        <Typography sx={{ mb: 1 }} variant='body1'>
                            What&apos;s Included:
                        </Typography>
                        <Stack component='ul' sx={{ pl: 3, m: 0 }}>
                            {workshop.recordings.map((rec) => (
                                <Typography component='li' key={rec.id} variant='body1'>
                                    {rec.title} {rec.pgn && '(Includes PGN solutions)'}
                                </Typography>
                            ))}
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, md: 5, lg: 4 }}>
                        <Paper
                            sx={{ p: 3, position: 'sticky', top: 24, bgcolor: 'background.paper' }}
                            variant='outlined'
                        >
                            <Typography
                                fontWeight='bold'
                                sx={{ mb: 1, textAlign: 'center' }}
                                variant='subtitle1'
                            >
                                {workshop.name}
                            </Typography>
                            <Typography sx={{ mb: 3, textAlign: 'center' }} variant='subtitle1'>
                                ${workshop.price}
                            </Typography>
                            <Button
                                color='success'
                                data-testid='workshop-buy-button'
                                fullWidth
                                onClick={() => setIsPurchased(true)}
                                startIcon={<ShoppingCartIcon />}
                                variant='contained'
                            >
                                BUY
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        );
    }

    return (
        <Container maxWidth='xl' sx={{ py: 5 }}>
            <Stack sx={{ mb: 4 }}>
                <Typography variant='h4'>{workshop.name}</Typography>
                <Typography color='text.secondary' variant='h5'>
                    {workshop.cohortRange}
                </Typography>
                <Divider sx={{ mt: 2 }} />
            </Stack>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 8, lg: 9 }}>
                    <Typography fontWeight='bold' sx={{ mb: 2 }} variant='h6'>
                        {activeRecording.title}
                    </Typography>

                    <WorkshopVideoPlayer
                        key={activeRecording.id}
                        title={activeRecording.title}
                        videoUrl={activeRecording.videoUrl}
                    />

                    <Stack direction='row' spacing={2}>
                        {activeRecording.pgn && (
                            <Button
                                color='primary'
                                component={Link}
                                data-testid='workshop-pgn-button'
                                href={`/games/analysis?pgn=${encodeURIComponent(activeRecording.pgn)}`}
                                variant='contained'
                            >
                                NEXT: PGN
                            </Button>
                        )}
                        <Button
                            color='inherit'
                            onClick={() => setIsPurchased(false)}
                            variant='outlined'
                        >
                            BACK TO SALES PAGE
                        </Button>
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                    <Paper sx={{ bgcolor: 'background.default', p: 2 }} variant='outlined'>
                        <Stack spacing={1}>
                            {workshop.recordings.map((rec, idx) => (
                                <Button
                                    data-testid={`recording-selector-${rec.id}`}
                                    key={rec.id}
                                    onClick={() => setActiveRecording(rec)}
                                    sx={{
                                        color:
                                            activeRecording.id === rec.id
                                                ? 'primary.main'
                                                : 'text.primary',
                                        fontWeight:
                                            activeRecording.id === rec.id ? 'bold' : 'normal',
                                        justifyContent: 'flex-start',
                                        textAlign: 'left',
                                        textTransform: 'none',
                                    }}
                                >
                                    {idx + 1}. {rec.title}
                                </Button>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}
