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
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
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
            <Typography variant='h4'>Live Class Recordings</Typography>
            <TextField
                fullWidth
                placeholder='Search by class name, teacher, or description'
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
                <Tooltip title='Show all recordings'>
                    <Chip
                        label='All'
                        variant={selectedTags.length === 0 ? 'filled' : 'outlined'}
                        color={selectedTags.length === 0 ? 'primary' : 'default'}
                        onClick={() => setSelectedTags([])}
                        sx={{ cursor: 'pointer' }}
                    />
                </Tooltip>
                <Tooltip title='Show recordings with tag: Lecture'>
                    <Chip
                        label='Lecture'
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
                <Tooltip title='Show recordings with tag: Game & Profile Review'>
                    <Chip
                        label='Game & Profile Review'
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
                    <Tooltip key={tag} title={`Show recordings with tag: ${tag}`}>
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
                            {opt.label}
                        </MenuItem>
                    ))}
                </Select>

                <Stack direction='row' alignItems='center' gap={1}>
                    <Typography variant='subtitle2' color='text.secondary'>
                        {filteredClasses.length} class{filteredClasses.length !== 1 ? 'es' : ''}
                    </Typography>
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, v: 'grid' | 'list') => setViewMode(v)}
                        aria-label='view mode'
                        size='small'
                    >
                        <Tooltip title='Grid view'>
                            <ToggleButton value='grid' aria-label='grid'>
                                <ViewModule />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title='List view'>
                            <ToggleButton value='list' aria-label='list'>
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
                        <Typography sx={{ mt: 1 }}>No classes match your filters</Typography>
                        <Button variant='text' color='primary' onClick={onClearFilters}>
                            Clear Filters
                        </Button>
                    </Stack>
                ) : (
                    <Stack alignItems='center'>
                        <Typography sx={{ mt: 1 }}>No classes found</Typography>
                    </Stack>
                )}
            </Stack>
        </Container>
    );
}
