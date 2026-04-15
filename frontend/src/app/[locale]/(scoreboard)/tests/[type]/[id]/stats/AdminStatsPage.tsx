'use client';

import { RequestSnackbar } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { ExamType } from '@/database/exam';
import ExamStatistics from '@/exams/view/ExamStatistics';
import { useExam } from '@/exams/view/exam';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { Box, Container } from '@mui/material';
import { useEffect } from 'react';

export function AdminStatsPage({ type, id }: { type: ExamType; id: string }) {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && !user.isAdmin) {
            router.push('/tests');
        }
    }, [user, router]);

    if (!user) {
        return <LoadingPage />;
    }

    return <AuthAdminStatsPage type={type} id={id} />;
}

function AuthAdminStatsPage({ type, id }: { type: ExamType; id: string }) {
    const { request, exam } = useExam({ type, id });

    if (request.isFailure()) {
        return (
            <Container sx={{ py: 5 }}>
                <RequestSnackbar request={request} />
            </Container>
        );
    }

    if (!request.isSent() || request.isLoading() || !exam) {
        return <LoadingPage />;
    }

    return (
        <Box height='calc(100vh - var(--navbar-height))'>
            <ExamStatistics exam={exam} />
        </Box>
    );
}
