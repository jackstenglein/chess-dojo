import { Link } from '@/components/navigation/Link';
import { formatTime } from '@/database/requirement';
import { CategoryColors } from '@/style/ThemeProvider';
import { MenuBook, PlayArrow } from '@mui/icons-material';
import { Box, Button, Card, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { CohortStudy } from './overview';
import { singularUnit } from './selectors';

/** The newest entry's date relative to now, such as "yesterday" or "4 days ago". */
export function relativeDate(iso: string): string {
    return DateTime.fromISO(iso).toRelative() ?? '';
}

export function CohortBlock({ studies }: { studies: CohortStudy[] }) {
    const t = useTranslations('study.overview');
    const tCommon = useTranslations('common');

    if (studies.length === 0) {
        return (
            <Typography sx={{ color: 'text.secondary' }} data-testid='reader-no-cohort-study'>
                {t('noCohortStudy')}
            </Typography>
        );
    }

    return (
        <Stack spacing={2}>
            {studies.map((study) => {
                const started = study.done > 0;
                const reached = study.total > 0 && study.done >= study.total;
                const percent = study.total ? Math.min(100, (100 * study.done) / study.total) : 0;
                const params = new URLSearchParams();
                if (study.next) params.set('item', study.next.key);
                if (study.browse) params.set('cohort', study.cohort);
                const query = params.size > 0 ? `?${params.toString()}` : '';
                const continueHref = `/study/${study.task.id}${query}`;
                const contentsHref = `/study/${study.task.id}${study.browse ? `?cohort=${study.cohort}` : ''}`;
                const action = study.browse ? t('read') : started ? t('continue') : t('start');
                return (
                    <Card
                        key={study.task.id}
                        variant='outlined'
                        sx={{ p: 3 }}
                        data-testid={study.browse ? 'reader-cohort-browse' : 'reader-cohort-study'}
                    >
                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            sx={{ gap: 4, alignItems: 'stretch' }}
                        >
                            <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Stack direction='row' sx={{ alignItems: 'center', gap: 2, mb: 1 }}>
                                    <Typography
                                        variant='overline'
                                        sx={{ color: 'primary.main', lineHeight: 1 }}
                                    >
                                        {study.browse
                                            ? t('browsing')
                                            : reached && study.workbook
                                              ? t('targetReached')
                                              : action}
                                    </Typography>
                                    <Chip
                                        size='small'
                                        label={study.task.category}
                                        sx={{
                                            backgroundColor: CategoryColors[study.task.category],
                                            color: 'white',
                                            fontWeight: 500,
                                        }}
                                    />
                                </Stack>
                                <Typography variant='h5'>{study.name}</Typography>
                                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                                    {study.unit
                                        ? study.courseName
                                            ? t('courseUnits', {
                                                  name: study.courseName,
                                                  count: study.total,
                                                  unit: study.unit,
                                              })
                                            : t('units', { count: study.total, unit: study.unit })
                                        : study.courseName
                                          ? t('courseGames', {
                                                name: study.courseName,
                                                count: study.total,
                                            })
                                          : t('games', { count: study.total })}
                                </Typography>
                                <Box sx={{ mt: 2.5, maxWidth: 520 }}>
                                    <LinearProgress variant='determinate' value={percent} />
                                    <Stack
                                        direction='row'
                                        sx={{ justifyContent: 'space-between', mt: 1 }}
                                    >
                                        <Typography
                                            variant='body2'
                                            data-testid='reader-cohort-count'
                                        >
                                            {study.unit
                                                ? t('studiedUnit', {
                                                      done: study.done,
                                                      total: study.total,
                                                      unit: study.unit,
                                                  })
                                                : t('studied', {
                                                      done: study.done,
                                                      total: study.total,
                                                  })}
                                        </Typography>
                                        <Typography
                                            variant='body2'
                                            sx={{ color: 'text.secondary' }}
                                        >
                                            {study.minutes > 0
                                                ? t('timeOnTask', {
                                                      time: formatTime(study.minutes, tCommon),
                                                  })
                                                : t('noTime')}
                                        </Typography>
                                    </Stack>
                                </Box>
                                <Stack direction='row' sx={{ gap: 1, mt: 'auto', pt: 2.5 }}>
                                    <Button
                                        variant='contained'
                                        startIcon={<PlayArrow />}
                                        component={Link}
                                        href={continueHref}
                                        data-testid='reader-continue'
                                    >
                                        {action}
                                    </Button>
                                    <Button
                                        startIcon={<MenuBook />}
                                        component={Link}
                                        href={contentsHref}
                                    >
                                        {t('contents')}
                                    </Button>
                                </Stack>
                            </Stack>
                            <Stack
                                sx={{
                                    width: { md: 420 },
                                    flexShrink: 0,
                                    p: 2,
                                    borderRadius: 1,
                                    bgcolor: 'action.hover',
                                    gap: 0.5,
                                }}
                            >
                                <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                                    {study.lastEntry || study.workbook
                                        ? t('upNext')
                                        : t('firstGame')}
                                </Typography>
                                <Typography variant='subtitle1' sx={{ fontWeight: 500 }}>
                                    {study.next?.name ??
                                        (study.nextPosition
                                            ? t('continueAt', {
                                                  unit: singularUnit(study.unit),
                                                  position: study.nextPosition,
                                              })
                                            : t('openToSee'))}
                                </Typography>
                                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                                    {study.lastEntry?.studyInfo
                                        ? t('lastStudied', {
                                              name: study.lastEntry.studyInfo.itemName,
                                              when: relativeDate(study.lastEntry.createdAt),
                                          })
                                        : t('nothingStudied')}
                                </Typography>
                            </Stack>
                        </Stack>
                    </Card>
                );
            })}
        </Stack>
    );
}
