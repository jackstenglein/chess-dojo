import { RatingSystem, dojoCohorts, formatRatingSystem, getRatingBoundary } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import {
    Container,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { Metadata } from 'next';

const { Custom, Custom2, Custom3, ...others } = RatingSystem;

export const metadata: Metadata = {
    title: 'ChessDojo Rating Converter',
    description: `Convert your ratings between FIDE, USCF, Chess.com, Lichess, and more.`,
};

export default function RatingConversionsPage() {
    const ratingSystems = Object.values(others);

    return (
        <Container
            maxWidth={false}
            sx={{
                py: 5,
                overflow: 'hidden',
            }}
        >
            <TableContainer
                component={Paper}
                sx={{
                    height: 'calc(100vh - var(--navbar-height) - 80px)',
                }}
            >
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Dojo Cohort</TableCell>
                            {ratingSystems.map((rs) => (
                                <TableCell key={rs} sx={{ fontWeight: 'bold' }}>
                                    {formatRatingSystem(rs)}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {dojoCohorts.slice(0, dojoCohorts.length - 1).map((c, i) => (
                            <TableRow key={c}>
                                <TableCell>
                                    <Stack direction='row' spacing={2} alignItems='center'>
                                        <CohortIcon cohort={c} tooltip='' />
                                        <Typography variant='body2'>{c}</Typography>
                                    </Stack>
                                </TableCell>
                                {ratingSystems.map((rs) => {
                                    let minRating =
                                        i === 0
                                            ? '0'
                                            : getRatingBoundary(dojoCohorts[i - 1], rs) || 0;

                                    if (minRating === 0 && rs === RatingSystem.Fide) {
                                        minRating = 1400;
                                    }

                                    const maxRating = getRatingBoundary(c, rs) || 0;

                                    if (!maxRating) {
                                        return <TableCell key={rs}>-</TableCell>;
                                    }

                                    return (
                                        <TableCell key={rs}>
                                            {`${minRating}-${maxRating}`}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell>
                                <Stack direction='row' spacing={2} alignItems='center'>
                                    <CohortIcon
                                        cohort={dojoCohorts[dojoCohorts.length - 1]}
                                        tooltip=''
                                    />
                                    <Typography variant='body2'>
                                        {dojoCohorts[dojoCohorts.length - 1]}
                                    </Typography>
                                </Stack>
                            </TableCell>
                            {ratingSystems.map((rs) => (
                                <TableCell key={rs}>
                                    {getRatingBoundary(dojoCohorts[dojoCohorts.length - 2], rs)}+
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}
