import { Link } from '@/components/navigation/Link';
import { Course } from '@/database/course';
import { CategoryColors } from '@/style/ThemeProvider';
import { Add, FolderOpen, MenuBook } from '@mui/icons-material';
import { Box, Button, Card, Chip, Divider, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { relativeDate } from './CohortBlock';
import { CourseRow, StudyRow } from './overview';

export interface YoursBlockProps {
    studies: StudyRow[];
    courses: CourseRow[];
    onNewStudy: () => void;
    onAddToPlan: (course: Course) => void;
}

function StudyLine({ row }: { row: StudyRow }) {
    const t = useTranslations('study.overview');
    const started = row.done > 0;
    const percent = row.total ? Math.min(100, (100 * row.done) / row.total) : 0;
    return (
        <Stack
            direction={{ xs: 'column', md: 'row' }}
            sx={{ gap: 3, alignItems: { md: 'center' }, py: 1.75 }}
            data-testid='reader-study-row'
        >
            <Stack sx={{ flexGrow: 1, minWidth: 0, gap: 0.5 }}>
                <Stack direction='row' sx={{ alignItems: 'center', gap: 1.25 }}>
                    <Typography variant='subtitle1' sx={{ fontWeight: 500 }} noWrap>
                        {row.task.name}
                    </Typography>
                    <Chip
                        size='small'
                        label={row.task.category}
                        sx={{
                            backgroundColor: CategoryColors[row.task.category],
                            color: 'white',
                            fontWeight: 500,
                        }}
                    />
                </Stack>
                <Stack direction='row' sx={{ alignItems: 'center', gap: 0.75 }}>
                    {row.source.kind === 'DIRECTORY' ? (
                        <FolderOpen fontSize='small' color='action' />
                    ) : (
                        <MenuBook fontSize='small' color='action' />
                    )}
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                        {row.source.kind === 'DIRECTORY'
                            ? t('folderSource', { count: row.total })
                            : row.sourceName
                              ? t('courseSourceNamed', { name: row.sourceName, count: row.total })
                              : t('courseSource', { count: row.total })}
                    </Typography>
                </Stack>
            </Stack>
            <Box sx={{ width: { md: 180 }, flexShrink: 0 }}>
                <LinearProgress variant='determinate' value={percent} />
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    {started
                        ? t('studied', { done: row.done, total: row.total })
                        : t('notStarted', { count: row.total })}
                </Typography>
            </Box>
            <Typography
                variant='caption'
                sx={{ color: 'text.secondary', width: { md: 96 }, textAlign: { md: 'right' } }}
            >
                {row.lastEntry ? relativeDate(row.lastEntry.createdAt) : ''}
            </Typography>
            <Button
                variant='outlined'
                size='small'
                component={Link}
                href={`/study/${row.task.id}`}
                sx={{ flexShrink: 0 }}
            >
                {started ? t('continue') : t('start')}
            </Button>
        </Stack>
    );
}

function CourseLine({ row, onAddToPlan }: { row: CourseRow; onAddToPlan: (c: Course) => void }) {
    const t = useTranslations('study.overview');
    return (
        <Stack
            direction='row'
            sx={{ gap: 2, alignItems: 'center', py: 1.5 }}
            data-testid='reader-course-row'
        >
            <Stack sx={{ flexGrow: 1, minWidth: 0, gap: 0.5 }}>
                <Typography variant='subtitle1' sx={{ fontWeight: 500 }} noWrap>
                    {row.course.name}
                </Typography>
                <Stack direction='row' sx={{ alignItems: 'center', gap: 0.75 }}>
                    <MenuBook fontSize='small' color='action' />
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                        {t('courseLine', { range: row.course.cohortRange })}
                    </Typography>
                </Stack>
            </Stack>
            <Button size='small' startIcon={<Add />} onClick={() => onAddToPlan(row.course)}>
                {t('addToPlan')}
            </Button>
            <Button
                size='small'
                variant='outlined'
                component={Link}
                href={`/study/course/${row.course.type}/${row.course.id}`}
                data-testid='reader-read'
            >
                {t('read')}
            </Button>
        </Stack>
    );
}

export function YoursBlock({ studies, courses, onNewStudy, onAddToPlan }: YoursBlockProps) {
    const t = useTranslations('study.overview');
    const [showOutside, setShowOutside] = useState(false);
    const inCohort = courses.filter((row) => row.inCohort);
    const outside = courses.filter((row) => !row.inCohort);
    const shown = showOutside ? [...inCohort, ...outside] : inCohort;

    return (
        <Card variant='outlined' sx={{ p: 3 }}>
            <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='h6'>{t('studiesFromGames')}</Typography>
                <Button size='small' startIcon={<Add />} onClick={onNewStudy}>
                    {t('newStudy')}
                </Button>
            </Stack>
            {studies.length > 0 ? (
                <Stack divider={<Divider />}>
                    {studies.map((row) => (
                        <StudyLine key={row.task.id} row={row} />
                    ))}
                </Stack>
            ) : (
                <Stack
                    direction='row'
                    sx={{
                        gap: 2,
                        alignItems: 'center',
                        p: 2,
                        my: 1,
                        border: 1,
                        borderStyle: 'dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                    }}
                    data-testid='reader-studies-hint'
                >
                    <FolderOpen color='action' />
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                        {t('studiesHint')}
                    </Typography>
                </Stack>
            )}

            <Typography variant='h6' sx={{ mt: 3 }}>
                {t('yourCourses')}
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', mb: 0.5 }}>
                {t('yourCoursesCaption')}
            </Typography>
            {shown.length > 0 ? (
                <Stack divider={<Divider />}>
                    {shown.map((row) => (
                        <CourseLine key={row.course.id} row={row} onAddToPlan={onAddToPlan} />
                    ))}
                </Stack>
            ) : (
                <Typography variant='body2' sx={{ color: 'text.secondary', py: 1.5 }}>
                    {t('noCourses')}
                </Typography>
            )}
            {outside.length > 0 && (
                <Button
                    size='small'
                    onClick={() => setShowOutside((s) => !s)}
                    sx={{ mt: 1 }}
                    data-testid='reader-show-outside'
                >
                    {showOutside ? t('hideOutside') : t('showOutside', { count: outside.length })}
                </Button>
            )}
        </Card>
    );
}
