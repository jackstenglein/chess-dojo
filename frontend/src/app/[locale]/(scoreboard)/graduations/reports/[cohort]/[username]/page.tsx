import { listGraduationsByOwner } from '@/api/graduationApi';
import GraduationCard from '@/components/graduations/GraduationCard';
import { Box, Container } from '@mui/material';
import { notFound } from 'next/navigation';

interface PageProps {
    params: Promise<{
        cohort: string;
        username: string;
    }>;
}

export default async function Page(props: PageProps) {
    const params = await props.params;
    const { username, cohort } = params;

    let graduations = await listGraduationsByOwner(username);

    graduations = graduations.filter((grad) => grad.previousCohort === cohort);

    if (graduations.length <= 0) {
        return notFound();
    }

    graduations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const gradSummary = graduations[0];

    return (
        <Container>
            <Box margin='auto'>
                <GraduationCard graduation={gradSummary} />
            </Box>
        </Container>
    );
}
