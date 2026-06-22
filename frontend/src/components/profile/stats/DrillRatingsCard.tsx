import Target from '@mui/icons-material/GpsFixed';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';

interface DrillRatingsCardProps {
    mateInOneRating?: number;
}

export function DrillRatingsCard({ mateInOneRating }: DrillRatingsCardProps) {
    if (!mateInOneRating || mateInOneRating <= 0) {
        return null;
    }

    return (
        <Card variant='outlined'>
            <CardContent>
                <Stack spacing={2}>
                    <Typography variant='h6'>
                        <Target
                            color='primary'
                            fontSize='large'
                            sx={{ marginRight: 1.5, verticalAlign: 'middle' }}
                        />
                        Drill Ratings
                    </Typography>
                    <Grid container justifyContent='center'>
                        <Grid size={{ xs: 12, sm: 4 }} display='flex' justifyContent='center'>
                            <Stack alignItems='center'>
                                <Typography variant='body1' color='text.secondary'>
                                    Mate-in-One PR
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: '2rem',
                                        lineHeight: 1,
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {mateInOneRating}
                                </Typography>
                            </Stack>
                        </Grid>
                    </Grid>
                </Stack>
            </CardContent>
        </Card>
    );
}
