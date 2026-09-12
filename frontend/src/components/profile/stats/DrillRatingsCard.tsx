import Target from '@mui/icons-material/GpsFixed';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

interface DrillRatingsCardProps {
    mateInOneRating?: number;
}

export function DrillRatingsCard({ mateInOneRating }: DrillRatingsCardProps) {
    if (!mateInOneRating || mateInOneRating <= 0) {
        return null;
    }

    return (
        <Card
            variant='outlined'
            sx={{
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: 1,
            }}
        >
            <Box sx={{ height: 4, bgcolor: 'primary.main' }} />
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack
                    direction='row'
                    spacing={1.5}
                    sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        rowGap: 1.5,
                    }}
                >
                    <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                bgcolor: 'action.hover',
                                flexShrink: 0,
                            }}
                        >
                            <Target color='primary' fontSize='medium' />
                        </Box>
                        <Typography variant='h6' sx={{ fontWeight: 600 }}>
                            Drill Ratings
                        </Typography>
                    </Stack>

                    <Stack sx={{ alignItems: 'center' }}>
                        <Typography variant='overline' sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                            Mate-in-One PR
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: '1.5rem',
                                letterSpacing: '-0.01em',
                                lineHeight: 1,
                                fontWeight: 'bold',
                            }}
                        >
                            {mateInOneRating}
                        </Typography>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}
