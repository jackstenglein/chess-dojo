'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import { Link } from '@/components/navigation/Link';
import {
    Course,
    CourseStatus,
    CourseType,
    displayCourseType,
    isCoursePublished,
} from '@/database/course';
import LoadingPage from '@/loading/LoadingPage';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Container,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { listAdminCourses } from 'src/api/courseApi';

export default function AdminCourseListPage() {
    const request = useRequest<Course[]>();

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            listAdminCourses()
                .then((courses) => request.onSuccess(courses))
                .catch((err) => request.onFailure(err));
        }
    }, [request]);

    const courses = request.data ?? [];
    const groups = groupByType(courses);

    return (
        <Container sx={{ py: 5 }}>
            <Stack spacing={3}>
                <Stack
                    direction='row'
                    sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 2 }}>
                        <IconButton component={Link} href='/admin' sx={{ display: 'flex' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant='h5'>Courses</Typography>
                    </Stack>
                    <Button
                        component={Link}
                        href='/admin/courses/new'
                        variant='contained'
                        startIcon={<AddIcon />}
                    >
                        New course
                    </Button>
                </Stack>

                {request.isLoading() && courses.length === 0 ? (
                    <LoadingPage />
                ) : courses.length === 0 ? (
                    <Typography sx={{ color: 'text.secondary' }}>No courses yet.</Typography>
                ) : (
                    <Stack spacing={4}>
                        {groups.map(([type, typeCourses]) => (
                            <Stack key={type} spacing={2}>
                                <Typography variant='h6' component='h2'>
                                    {displayCourseType(type)}
                                </Typography>
                                {typeCourses.map((course) => (
                                    <Card key={`${course.type}-${course.id}`} variant='outlined'>
                                        <CardActionArea
                                            component={Link}
                                            href={`/admin/courses/${course.type}/${course.id}`}
                                            sx={{ flex: 1, borderRadius: 1 }}
                                        >
                                            <CardContent>
                                                <Stack
                                                    direction='row'
                                                    sx={{
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start',
                                                        flexWrap: 'wrap',
                                                        gap: 1,
                                                    }}
                                                >
                                                    <Stack sx={{ py: 0.5 }}>
                                                        <Typography variant='h6' component='h3'>
                                                            {course.name || 'Untitled course'}
                                                        </Typography>
                                                        {course.cohortRange && (
                                                            <Typography
                                                                variant='body2'
                                                                sx={{ color: 'text.secondary' }}
                                                            >
                                                                {course.cohortRange}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                    <Chip
                                                        variant='filled'
                                                        color={
                                                            isCoursePublished(course)
                                                                ? 'success'
                                                                : 'warning'
                                                        }
                                                        label={
                                                            isCoursePublished(course)
                                                                ? CourseStatus.Published
                                                                : CourseStatus.Draft
                                                        }
                                                    />
                                                </Stack>
                                            </CardContent>
                                        </CardActionArea>
                                    </Card>
                                ))}
                            </Stack>
                        ))}
                    </Stack>
                )}

                <RequestSnackbar request={request} />
            </Stack>
        </Container>
    );
}

/** Groups courses under their type, in the enum's order, with unknown types last. */
function groupByType(courses: Course[]): [CourseType, Course[]][] {
    const known = Object.values(CourseType);
    const types = [...new Set(courses.map((course) => course.type))].sort((a, b) => {
        const ai = known.indexOf(a);
        const bi = known.indexOf(b);
        if (ai === -1 && bi === -1) {
            return a.localeCompare(b);
        }
        if (ai === -1 || bi === -1) {
            return ai === -1 ? 1 : -1;
        }
        return ai - bi;
    });
    return types.map((type) => [type, courses.filter((course) => course.type === type)]);
}
