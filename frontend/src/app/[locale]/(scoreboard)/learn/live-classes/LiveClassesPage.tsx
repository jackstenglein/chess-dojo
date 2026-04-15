'use client';

import { listRecordings } from '@/api/liveClassesApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import LoadingPage from '@/loading/LoadingPage';
import { PresenterIcon } from '@/style/PresenterIcon';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { LiveClass } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { Search, Troubleshoot, ViewList, ViewModule } from '@mui/icons-material';
import {
    Button,
    Chip,
    Container,
    InputAdornment,
    MenuItem,
    Select,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LiveClassesList } from './LiveClassesList';
import {
    COHORT_LEVELS,
    compareLiveClasses,
    getUniqueTags,
    matchesCohortLevel,
    matchesSearch,
    matchesTagFilter,
    type CohortLevelValue,
} from './liveClassUtils';

export function LiveClassesPage() {
    const t = useTranslations('learn.liveClasses');
    const request = useRequest<LiveClass[]>();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [cohortLevel, setCohortLevel] = useState<CohortLevelValue>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            listRecordings()
                .then((resp) => {
                    request.onSuccess(resp.data.classes ?? []);
                })
                .catch((err: unknown) => {
                    request.onFailure(err);
                });
        }
    });

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    const allClasses = [...(request.data ?? [])].sort(compareLiveClasses);
    const filteredClasses = allClasses.filter(
        (c) =>
            matchesSearch(c, searchQuery) &&
            matchesTagFilter(c, selectedTags) &&
            matchesCohortLevel(c, cohortLevel),
    );
    const allTags = getUniqueTags(allClasses);

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((tt) => tt !== tag) : [...prev, tag],
        );
    };

    const onClearFilters = () => {
        setSelectedTags([]);
        setSearchQuery('');
        setCohortLevel('all');
    };

    const hasFilter = selectedTags.length > 0 || searchQuery.trim() !== '' || cohortLevel !== 'all';

    return (
        <Container sx={{ py: 5 }}>
            <RequestSnackbar request={request} />
            <Typography variant='h4'>{t('title')}</Typography>
            <TextField
                fullWidth
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size='small'
                sx={{ mt: 2 }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position='start'>
                                <Search />
                            </InputAdornment>
                        ),
                    },
                }}
            />

            <Stack direction='row' flexWrap='wrap' gap={1} alignItems='center' sx={{ mt: 2 }}>
                <Tooltip title={t('showAll')}>
                    <Chip
                        label={t('all')}
                        variant={selectedTags.length === 0 ? 'filled' : 'outlined'}
                        color={selectedTags.length === 0 ? 'primary' : 'default'}
                        onClick={() => setSelectedTags([])}
                        sx={{ cursor: 'pointer' }}
                    />
                </Tooltip>
                <Tooltip title={t('showTagLecture')}>
                    <Chip
                        label={t('lecture')}
                        variant={
                            selectedTags.includes(SubscriptionTier.Lecture) ? 'filled' : 'outlined'
                        }
                        color={
                            selectedTags.includes(SubscriptionTier.Lecture) ? 'primary' : 'default'
                        }
                        onClick={() => toggleTag(SubscriptionTier.Lecture)}
                        sx={{ cursor: 'pointer' }}
                        icon={<PresenterIcon sx={{ fontSize: '1.5rem' }} />}
                    />
                </Tooltip>
                <Tooltip title={t('showTagGameReview')}>
                    <Chip
                        label={t('gameReview')}
                        variant={
                            selectedTags.includes(SubscriptionTier.GameReview)
                                ? 'filled'
                                : 'outlined'
                        }
                        color={
                            selectedTags.includes(SubscriptionTier.GameReview)
                                ? 'primary'
                                : 'default'
                        }
                        onClick={() => toggleTag(SubscriptionTier.GameReview)}
                        sx={{ cursor: 'pointer' }}
                        icon={<Troubleshoot />}
                    />
                </Tooltip>

                {allTags.map((tag) => (
                    <Tooltip key={tag} title={t('showTagDynamic', { tag })}>
                        <Chip
                            key={tag}
                            label={tag}
                            variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                            color={selectedTags.includes(tag) ? 'primary' : 'default'}
                            onClick={() => toggleTag(tag)}
                            sx={{ cursor: 'pointer' }}
                        />
                    </Tooltip>
                ))}
            </Stack>

            <Stack
                direction='row'
                alignItems='center'
                justifyContent='space-between'
                gap={1}
                sx={{ mt: 2 }}
                flexWrap='wrap'
            >
                <Select
                    size='small'
                    value={cohortLevel}
                    onChange={(e) => setCohortLevel(e.target.value)}
                    sx={{ minWidth: 220 }}
                >
                    {COHORT_LEVELS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                            {t(`cohortLevels.${opt.value}`)}
                        </MenuItem>
                    ))}
                </Select>

                <Stack direction='row' alignItems='center' gap={1}>
                    <Typography variant='subtitle2' color='text.secondary'>
                        {t('classCount', { count: filteredClasses.length })}
                    </Typography>
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, v: 'grid' | 'list') => setViewMode(v)}
                        aria-label={t('viewModeAriaLabel')}
                        size='small'
                    >
                        <Tooltip title={t('gridView')}>
                            <ToggleButton value='grid' aria-label={t('gridAriaLabel')}>
                                <ViewModule />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title={t('listView')}>
                            <ToggleButton value='list' aria-label={t('listAriaLabel')}>
                                <ViewList />
                            </ToggleButton>
                        </Tooltip>
                    </ToggleButtonGroup>
                </Stack>
            </Stack>

            <Stack spacing={5} mt={5}>
                {filteredClasses.length > 0 ? (
                    <LiveClassesList
                        classes={filteredClasses}
                        onTagClick={toggleTag}
                        selectedTags={selectedTags}
                        variant={viewMode}
                    />
                ) : hasFilter ? (
                    <Stack alignItems='center'>
                        <Typography sx={{ mt: 1 }}>{t('noClassesMatchFilters')}</Typography>
                        <Button variant='text' color='primary' onClick={onClearFilters}>
                            {t('clearFilters')}
                        </Button>
                    </Stack>
                ) : (
                    <Stack alignItems='center'>
                        <Typography sx={{ mt: 1 }}>{t('noClasses')}</Typography>
                    </Stack>
                )}
            </Stack>
        </Container>
    );
}
