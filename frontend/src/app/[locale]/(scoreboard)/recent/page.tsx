import { Container } from '@mui/material';
import RecentGraduates from './RecentGraduates';

export default function RecentPage() {
    return (
        <Container maxWidth='lg' sx={{ pt: 6, pb: 4 }}>
            <RecentGraduates />
        </Container>
    );
}
