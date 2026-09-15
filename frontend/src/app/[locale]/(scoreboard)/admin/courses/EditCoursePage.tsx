'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import PurchaseCoursePage from '@/app/[locale]/(scoreboard)/courses/[type]/[id]/[chapter]/[module]/PurchaseCoursePage';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { CohortSelect } from '@/components/ui/CohortSelect';
import { Course, CourseStatus, CourseType, displayCourseType } from '@/database/course';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Container,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { ContentEditor } from './ContentEditor';
import { CourseContentPreview } from './CourseContentPreview';
import {
    cohortRangeFromCohorts,
    emptyCourse,
    prepareCourseForSave,
    publishValidationError,
} from './courseEditor';
import { PurchaseOptionsEditor } from './PurchaseOptionsEditor';

export function EditCoursePage({ type, id }: { type?: string; id?: string }) {
    const isCreate = !type || !id;
    const auth = useAuth();
    const router = useRouter();
    const api = useApi();
    const getRequest = useRequest<Course>();
    const saveRequest = useRequest<Course>();

    const [courseState, setCourse] = useState<Course | undefined>();
    const [tab, setTab] = useState(0);
    const [previewMode, setPreviewMode] = useState<'purchase' | 'content'>('purchase');
    const [publishError, setPublishError] = useState('');

    useEffect(() => {
        if (isCreate || getRequest.isSent()) {
            return;
        }
        getRequest.onStart();
        api.getCourse(type, id)
            .then((resp) => {
                const loaded = {
                    ...resp.data.course,
                    whatsIncluded: resp.data.course.whatsIncluded ?? [],
                    purchaseOptions: resp.data.course.purchaseOptions ?? [],
                    chapters: resp.data.course.chapters ?? [],
                    status: resp.data.course.status || CourseStatus.Published,
                };
                setCourse(loaded);
                getRequest.onSuccess(loaded);
            })
            .catch((err) => getRequest.onFailure(err));
    }, [auth.user, isCreate, type, id, api, getRequest]);

    const handleSave = (status: CourseStatus) => {
        const source = courseState ?? (isCreate && auth.user ? emptyCourse(auth.user) : undefined);
        if (!source) {
            return;
        }
        if (!source.name.trim()) {
            setPublishError('Name is required');
            return;
        }
        if (status === CourseStatus.Published) {
            const error = publishValidationError(source);
            if (error) {
                setPublishError(error);
                return;
            }
        }
        setPublishError('');
        const payload = prepareCourseForSave(source, status);
        saveRequest.onStart();
        api.setCourse(payload)
            .then((resp) => {
                const saved = resp.data;
                setCourse({
                    ...saved,
                    whatsIncluded: saved.whatsIncluded ?? [],
                    purchaseOptions: saved.purchaseOptions ?? [],
                    chapters: saved.chapters ?? [],
                });
                saveRequest.onSuccess(saved);
                if (isCreate && saved.id) {
                    router.push(`/admin/courses/${saved.type}/${saved.id}`);
                }
            })
            .catch((err) => saveRequest.onFailure(err));
    };

    if (auth.status === AuthStatus.Loading || !auth.user?.isAdmin) {
        return <LoadingPage />;
    }

    const course = courseState ?? (isCreate ? emptyCourse(auth.user) : undefined);

    if (!isCreate && getRequest.isLoading() && !course) {
        return <LoadingPage />;
    }

    if (!isCreate && getRequest.isFailure() && !course) {
        return (
            <Container sx={{ py: 5 }}>
                <Stack spacing={2}>
                    <Typography color='error'>Course not found</Typography>
                    <RequestSnackbar request={getRequest} />
                </Stack>
            </Container>
        );
    }

    if (!course) {
        return <LoadingPage />;
    }

    const status = course.status || CourseStatus.Draft;

    return (
        <Container maxWidth={tab === 2 && previewMode === 'content' ? false : 'lg'} sx={{ py: 5 }}>
            <Stack spacing={3}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    sx={{
                        alignItems: { md: 'center' },
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 2 }}>
                        <IconButton component={Link} href='/admin/courses' sx={{ display: 'flex' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant='h5'>
                            {isCreate ? 'Create course' : 'Edit course'}
                        </Typography>
                        <Chip
                            size='small'
                            color={status === CourseStatus.Published ? 'success' : 'warning'}
                            label={status === CourseStatus.Published ? 'Published' : 'Draft'}
                        />
                    </Stack>
                    <Stack direction='row' sx={{ gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            variant='outlined'
                            onClick={() => handleSave(CourseStatus.Draft)}
                            loading={saveRequest.isLoading()}
                        >
                            Save draft
                        </Button>
                        <Button
                            variant='contained'
                            onClick={() => handleSave(CourseStatus.Published)}
                            loading={saveRequest.isLoading()}
                        >
                            Publish
                        </Button>
                    </Stack>
                </Stack>

                {publishError && <Typography color='error'>{publishError}</Typography>}

                <Tabs value={tab} onChange={(_, value: number) => setTab(value)}>
                    <Tab label='Details' />
                    <Tab label='Content' />
                    <Tab label='Preview' />
                </Tabs>

                {tab === 0 && (
                    <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <FormControl
                                sx={{ minWidth: 200 }}
                                disabled={!isCreate && Boolean(course.id)}
                            >
                                <InputLabel id='course-type'>Type</InputLabel>
                                <Select
                                    labelId='course-type'
                                    label='Type'
                                    value={course.type}
                                    onChange={(e) => setCourse({ ...course, type: e.target.value })}
                                >
                                    {Object.values(CourseType).map((courseType) => (
                                        <MenuItem key={courseType} value={courseType}>
                                            {displayCourseType(courseType)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl sx={{ minWidth: 160 }}>
                                <InputLabel id='course-color'>Color</InputLabel>
                                <Select
                                    labelId='course-color'
                                    label='Color'
                                    value={course.color}
                                    onChange={(e) =>
                                        setCourse({ ...course, color: e.target.value })
                                    }
                                >
                                    <MenuItem value='None'>None</MenuItem>
                                    <MenuItem value='White'>White</MenuItem>
                                    <MenuItem value='Black'>Black</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <TextField
                            label='Name'
                            value={course.name}
                            onChange={(e) => setCourse({ ...course, name: e.target.value })}
                            fullWidth
                            required
                        />
                        <TextField
                            label='Author display name'
                            value={course.ownerDisplayName}
                            onChange={(e) =>
                                setCourse({ ...course, ownerDisplayName: e.target.value })
                            }
                            fullWidth
                        />
                        <CohortSelect
                            multiple
                            label='Cohorts'
                            selected={course.cohorts}
                            setSelected={(cohorts) =>
                                setCourse({
                                    ...course,
                                    cohorts,
                                    cohortRange: cohortRangeFromCohorts(cohorts),
                                })
                            }
                        />
                        <TextField
                            label='Thumbnail image URL'
                            value={course.imageUrl ?? ''}
                            onChange={(e) => setCourse({ ...course, imageUrl: e.target.value })}
                            fullWidth
                            helperText='Shown on the course list and purchase page'
                        />
                        <TextField
                            label='Intro YouTube URL'
                            value={course.videoUrl ?? ''}
                            onChange={(e) => setCourse({ ...course, videoUrl: e.target.value })}
                            fullWidth
                            helperText='Watch, share, Shorts, or embed URL describing the course'
                        />
                        <TextField
                            label='Description'
                            value={course.description}
                            onChange={(e) => setCourse({ ...course, description: e.target.value })}
                            fullWidth
                            required
                            multiline
                            minRows={4}
                            helperText='Separate paragraphs with a blank line'
                        />
                        <StringListField
                            label="What's included"
                            addLabel='Add item'
                            values={course.whatsIncluded ?? []}
                            onChange={(whatsIncluded) => setCourse({ ...course, whatsIncluded })}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={course.includedWithSubscription}
                                    onChange={(e) =>
                                        setCourse({
                                            ...course,
                                            includedWithSubscription: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label='Included with Training Plan subscription'
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={course.availableForFreeUsers}
                                    onChange={(e) =>
                                        setCourse({
                                            ...course,
                                            availableForFreeUsers: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label='Available for free-tier users to purchase'
                        />
                        <PurchaseOptionsEditor
                            options={course.purchaseOptions ?? []}
                            onChange={(purchaseOptions) =>
                                setCourse({ ...course, purchaseOptions })
                            }
                        />
                    </Stack>
                )}

                {tab === 1 && (
                    <ContentEditor
                        course={course}
                        onChange={(newCourse) => setCourse({ ...course, ...newCourse })}
                    />
                )}

                {tab === 2 && (
                    <Stack spacing={2}>
                        <ToggleButtonGroup
                            exclusive
                            size='small'
                            value={previewMode}
                            onChange={(_, value: 'purchase' | 'content' | null) => {
                                if (value) {
                                    setPreviewMode(value);
                                }
                            }}
                        >
                            <ToggleButton value='purchase'>Purchase page</ToggleButton>
                            <ToggleButton value='content'>Course content</ToggleButton>
                        </ToggleButtonGroup>
                        {previewMode === 'purchase' ? (
                            <Box
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                }}
                            >
                                <PurchaseCoursePage course={course} preview isFreeTier={false} />
                            </Box>
                        ) : (
                            <CourseContentPreview course={course} />
                        )}
                    </Stack>
                )}

                <RequestSnackbar
                    request={saveRequest}
                    showSuccess
                    defaultSuccessMessage={
                        saveRequest.data?.status === CourseStatus.Published
                            ? 'Course published'
                            : 'Draft saved'
                    }
                />
            </Stack>
        </Container>
    );
}

function StringListField({
    label,
    addLabel,
    values,
    onChange,
}: {
    label: string;
    addLabel: string;
    values: string[];
    onChange: (values: string[]) => void;
}) {
    const items = values.length > 0 ? values : [''];
    return (
        <Stack>
            <Typography variant='subtitle1' sx={{ mb: 1.5 }}>
                {label}
            </Typography>
            {items.map((value, index) => (
                <TextField
                    key={index}
                    label={`${label} ${index + 1}`}
                    value={value}
                    onChange={(e) => {
                        const next = [...items];
                        next[index] = e.target.value;
                        onChange(next);
                    }}
                    fullWidth
                    sx={{ mb: 2 }}
                />
            ))}
            <Button
                size='small'
                onClick={() => onChange([...items, ''])}
                sx={{ alignSelf: 'flex-start' }}
            >
                {addLabel}
            </Button>
        </Stack>
    );
}
