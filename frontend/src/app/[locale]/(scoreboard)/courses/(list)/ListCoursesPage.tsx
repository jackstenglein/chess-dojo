'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { Course } from '@/database/course';
import { getCohortRange } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { Container, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { getCheckoutSessionId } from '../localStorage';
import { CourseFilterEditor, useCourseFilters } from './CourseFilters';
import CourseListItem from './CourseListItem';

const ListCoursesPage = () => {
    const t = useTranslations('courses.list');
    const courseFilters = useCourseFilters();
    const request = useRequest<Course[]>();
    const api = useApi();
    const { user } = useAuth();
    const isFreeTier = useFreeTier();

    useEffect(() => {
        if (!request.isSent()) {
            api.listAllCourses()
                .then((courses) => {
                    request.onSuccess(courses);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api]);

    const courses =
        request.data?.filter((course) => {
            const isPurchased = user?.purchasedCourses
                ? user.purchasedCourses[course.id]
                : getCheckoutSessionId(course.id) !== '';

            const isAccessible = isPurchased || (course.includedWithSubscription && !isFreeTier);

            if (!courseFilters.categories[course.type]) {
                return false;
            }

            if (courseFilters.showAccessible && !isAccessible) {
                return false;
            }

            const cohortRange = getCohortRange(courseFilters.minCohort, courseFilters.maxCohort);
            if (cohortRange.every((c) => !course.cohorts.includes(c))) {
                return false;
            }

            return true;
        }) ?? [];

    const noItems = !courses.length;

    return (
        <Container maxWidth='xl' sx={{ py: 5 }}>
            <RequestSnackbar request={request} />
            <Grid container spacing={3}>
                <Grid
                    size={{
                        xs: 12,
                        md: 2,
                    }}
                >
                    <CourseFilterEditor filters={courseFilters} />
                </Grid>

                <Grid
                    container
                    spacing={2}
                    size={{
                        xs: 12,
                        md: 10,
                    }}
                >
                    {courses.map((course) => (
                        <Grid
                            key={course.id}
                            size={{
                                xs: 12,
                                md: 6,
                                lg: 4,
                            }}
                        >
                            <CourseListItem
                                key={course.id}
                                course={course}
                                isFreeTier={isFreeTier}
                                isPurchased={
                                    user?.purchasedCourses
                                        ? user.purchasedCourses[course.id]
                                        : getCheckoutSessionId(course.id) !== ''
                                }
                                filters={courseFilters}
                            />
                        </Grid>
                    ))}

                    {noItems && (request.isLoading() || !request.isSent()) && (
                        <Stack justifyContent='center' alignItems='center' width={1}>
                            <LoadingPage />
                        </Stack>
                    )}
                    {noItems && !request.isLoading() && request.isSent() && (
                        <Typography>{t('noCoursesFound')}</Typography>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
};

export default ListCoursesPage;
