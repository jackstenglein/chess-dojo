'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { Course } from '@/database/course';
import { getCohortRange } from '@/database/user';
import { mockWorkshops } from '@/database/workshop';
import LoadingPage from '@/loading/LoadingPage';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import {
    Button,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Chip,
    Container,
    Divider,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { getCheckoutSessionId } from '../localStorage';
import { CourseFilterEditor, useCourseFilters } from './CourseFilters';
import CourseListItem, { getCategoryColor } from './CourseListItem';

const ListCoursesPage = () => {
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
                    <Grid size={{ xs: 12 }} sx={{ mb: 1 }}>
                        <Typography variant='h4' fontWeight='bold'>
                            Courses
                        </Typography>
                    </Grid>

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
                        <Stack width={1} sx={{ mt: 2, mb: 4 }}>
                            <Typography color='text.secondary'>
                                No courses found matching your filters.
                            </Typography>
                        </Stack>
                    )}

                    <Grid size={{ xs: 12 }} sx={{ mt: 6, mb: 2 }}>
                        <Divider sx={{ mb: 4 }} />
                        <Typography variant='h4' fontWeight='bold' mb={1}>
                            Workshops
                        </Typography>
                    </Grid>

                    {mockWorkshops.map((workShop) => (
                        <Grid key={workShop.id} size={{ xs: 12, md: 6, lg: 4 }}>
                            <Card sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
                                <CardActionArea
                                    sx={{ flexGrow: 1 }}
                                    component={Link}
                                    href={`/workshops/${workShop.id}`}
                                >
                                    <CardContent>
                                        <Typography variant='h5'>{workShop.name}</Typography>
                                        <Typography variant='body2'>
                                            By{' '}
                                            <Typography
                                                component='span'
                                                variant='body2'
                                                color='primary'
                                            >
                                                {workShop.teacher}
                                            </Typography>
                                        </Typography>

                                        <Stack
                                            direction='row'
                                            spacing={1}
                                            alignItems='baseline'
                                            mb={1}
                                            mt={1}
                                        >
                                            <Typography variant='h6'>${workShop.price}</Typography>
                                        </Stack>

                                        <Stack direction='row' mb={2} spacing={1}>
                                            <Chip
                                                size='small'
                                                label={workShop.category}
                                                sx={{
                                                    backgroundColor: getCategoryColor(
                                                        workShop.category,
                                                    ),
                                                    color: 'white',
                                                }}
                                            />
                                            <Chip size='small' label={workShop.cohortRange} />
                                        </Stack>

                                        <Typography variant='body2' color='text.secondary' mt={2}>
                                            {workShop.description}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    <Button
                                        size='medium'
                                        color='success'
                                        fullWidth
                                        startIcon={<ShoppingCartIcon />}
                                        component={Link}
                                        href={`/workshops/${workShop.id}`}
                                    >
                                        Buy
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Grid>
        </Container>
    );
};

export default ListCoursesPage;
