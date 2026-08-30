'use client';

import NotFoundPage from '@/NotFoundPage';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { GetCourseResponse } from '@/api/courseApi';
import { AuthStatus, useAuth, useFreeTier } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import LoadingPage from '@/loading/LoadingPage';
import { logger } from '@/logging/logger';
import { useTranslatedCourse } from '@/translation/useTranslatedCourse';
import { Alert, Box, Button, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { getCheckoutSessionId, setCheckoutSessionId } from '../../../../localStorage';
import Contents from './Contents';
import Module from './Module';
import PurchaseCoursePage from './PurchaseCoursePage';
import { getAdjacentModule } from './courseUtils';

function AdminEditBar({ type, id, padded }: { type: string; id: string; padded?: boolean }) {
    const button = (
        <Button
            component={Link}
            href={`/admin/courses/${type}/${id}`}
            variant='outlined'
            size='small'
            sx={{ mb: 2 }}
        >
            Edit course
        </Button>
    );
    if (padded) {
        return (
            <Container maxWidth='lg' sx={{ pt: 2 }}>
                {button}
            </Container>
        );
    }
    return button;
}

export const CoursePage = ({
    params,
}: {
    params: { type: string; id: string; chapter?: string; module?: string };
}) => {
    const t = useTranslations('courses.page');
    const auth = useAuth();
    const anonymousUser = auth.user === undefined;
    const isFreeTier = useFreeTier();
    const api = useApi();
    const request = useRequest<GetCourseResponse>();

    const { searchParams } = useNextSearchParams();
    const [checkoutId, setCheckoutId] = useState(searchParams.get('checkout') || '');

    useEffect(() => {
        setCheckoutId(getCheckoutSessionId(params.id));
    }, [setCheckoutId, params.id]);

    useEffect(() => {
        if (!request.isSent() && auth.status !== AuthStatus.Loading && params.type && params.id) {
            request.onStart();
            api.getCourse(params.type, params.id, checkoutId)
                .then((resp) => {
                    request.onSuccess(resp.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api, params, checkoutId, auth.status]);

    useEffect(() => {
        if (anonymousUser) {
            logger.debug?.(`Set checkout session id for course ${params.id} to ${checkoutId}`);
            setCheckoutSessionId(params.id, checkoutId);
        }
    }, [anonymousUser, params.id, checkoutId]);

    const chapterIndex = parseInt(params.chapter || '0');
    const { course: rawCourse, isBlocked } = request.data || {};
    const course = useTranslatedCourse(rawCourse);
    const chapter = useMemo(() => {
        return course?.chapters ? course.chapters[chapterIndex] : undefined;
    }, [course, chapterIndex]);

    const moduleIndex = parseInt(params.module || '0');
    const courseModule = useMemo(() => {
        if (moduleIndex >= 0 && moduleIndex < (chapter?.modules.length || 0)) {
            return chapter?.modules[moduleIndex];
        }
    }, [chapter, moduleIndex]);

    if (isBlocked) {
        // Pass rawCourse so PurchaseCoursePage runs useTranslatedCourse once
        // rather than translating an already-translated Course.
        return (
            <>
                {auth.user?.isAdmin && <AdminEditBar type={params.type} id={params.id} padded />}
                <PurchaseCoursePage course={rawCourse} isFreeTier={isFreeTier} />
            </>
        );
    }

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    if (course === undefined || chapter === undefined || courseModule === undefined) {
        return <NotFoundPage />;
    }

    const prevModule = getAdjacentModule(chapterIndex, moduleIndex, course.chapters, -1);
    const nextModule = getAdjacentModule(chapterIndex, moduleIndex, course.chapters, 1);

    return (
        <Container maxWidth={false} sx={{ pt: 6, pb: 4 }}>
            {auth.user?.isAdmin && <AdminEditBar type={course.type} id={course.id} />}
            {anonymousUser && (
                <Alert
                    severity='warning'
                    variant='filled'
                    sx={{ mb: 4 }}
                    action={
                        <Button component={Link} href='/signup' size='small' color='inherit'>
                            {t('createAccount')}
                        </Button>
                    }
                >
                    {t('anonymousWarning')}
                </Alert>
            )}
            <Grid
                container
                sx={{
                    rowGap: 2,
                }}
            >
                <Grid size={{ xs: 12, md: 9.5 }}>
                    <Stack>
                        <Typography variant='h4'>{course.name}</Typography>
                        <Typography
                            variant='h5'
                            sx={{
                                color: 'text.secondary',
                            }}
                        >
                            {course.cohortRange}
                        </Typography>
                        <Divider />

                        <Box
                            sx={{
                                mt: 2,
                            }}
                        >
                            <Module module={courseModule} />
                        </Box>
                    </Stack>

                    <Stack
                        direction='row'
                        sx={{
                            justifyContent: 'space-between',
                            mt: 4,
                            px: { xs: 0, md: 4 },
                        }}
                    >
                        {prevModule && (
                            <Button
                                variant='contained'
                                component={Link}
                                href={`/courses/${params.type}/${params.id}/${prevModule.chapterIndex}/${prevModule.moduleIndex}`}
                            >
                                {t('previous', { name: prevModule.name })}
                            </Button>
                        )}

                        {nextModule && (
                            <Button
                                variant='contained'
                                component={Link}
                                href={`/courses/${params.type}/${params.id}/${nextModule.chapterIndex}/${nextModule.moduleIndex}`}
                            >
                                {t('next', { name: nextModule.name })}
                            </Button>
                        )}
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 2.5 }}>
                    <Contents
                        course={course}
                        selectedChapter={chapterIndex}
                        selectedModule={moduleIndex}
                    />
                </Grid>
            </Grid>
            <RequestSnackbar request={request} />
        </Container>
    );
};
