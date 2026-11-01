'use client';

import { Box, Stack, Typography } from '@mui/material';
import { ClassId, REVIEW_TEAMS } from '../content';
import { Body, Condensed, HAIRLINE, Heading, MUTED, ORANGE, revealSx, Section } from './shared';
import { VideoPlayer } from './VideoPlayer';

const REVIEW_POSTER =
    'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_steinitz-1.webp';

export function GameReview({
    playing,
    onPlay,
}: {
    playing: boolean;
    onPlay: (classId: ClassId) => void;
}) {
    return (
        <Box
            sx={{
                bgcolor: '#0A1A33',
                backgroundImage: 'linear-gradient(160deg, #0F2A52 0%, #08080F 75%)',
            }}
        >
            <Section>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr' },
                        gap: { xs: 5, md: 8 },
                        alignItems: 'center',
                    }}
                >
                    <Box>
                        <Heading sx={{ mb: 3 }}>Get your own games in front of a sensei</Heading>
                        <Body sx={{ color: 'common.white' }}>
                            You join a team of about 10 players at your rating. Each week you go
                            through each other’s games in a peer review. Then a sensei looks at one
                            member’s profile and games, and that spot rotates through the team.
                        </Body>
                        <Body sx={{ mt: 2 }}>
                            When it’s your turn, a GM or IM looks at how you think and how you
                            train. In the other weeks you watch it happen to players at your level.
                        </Body>
                        <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${HAIRLINE}` }}>
                            <Condensed sx={{ color: ORANGE, fontSize: '1.3rem' }}>
                                A private hour with a US GM costs about $150-200.
                            </Condensed>
                            <Body sx={{ mt: 0.5 }}>
                                Here that buys a month with your team, weekly reviews and every
                                workshop.
                            </Body>
                        </Box>
                    </Box>

                    <Box sx={revealSx}>
                        <VideoPlayer
                            youtubeId='p98XXb2d8i4'
                            title='Game & Profile Review with GM Jesse Kraai'
                            poster={REVIEW_POSTER}
                            playing={playing}
                            onPlay={() => onPlay('game-review')}
                        />
                        <Typography variant='body2' sx={{ mt: 1.25, color: MUTED }}>
                            Watch a real session: GM Jesse Kraai reviews a member’s first game in
                            the Najdorf. 55 min, free.
                        </Typography>
                        <Stack direction='row' sx={{ mt: 2.5, gap: 1, flexWrap: 'wrap' }}>
                            {REVIEW_TEAMS.map((team) => (
                                <Box
                                    key={team.name}
                                    sx={{
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 5,
                                        border: `1px solid ${HAIRLINE}`,
                                        fontSize: '0.95rem',
                                    }}
                                >
                                    {team.name} {team.band}
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Box>
            </Section>
        </Box>
    );
}
