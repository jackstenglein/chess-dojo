import { Container } from '@mui/material';
import { Suspense } from 'react';
import TournamentsPage from './TournamentsPage';

export default function Page() {
    return (
        <Container maxWidth='xl' sx={{ py: 5 }}>
            <Suspense>
                <TournamentsPage />
            </Suspense>
        </Container>
    );
}
