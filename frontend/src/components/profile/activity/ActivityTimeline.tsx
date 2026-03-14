import { Request, RequestSnackbar } from '@/api/Request';
import { useFilters } from '@/components/calendar/filters/CalendarFilters';
import { DefaultTimezone } from '@/components/calendar/filters/TimezoneSelector';
import LoadMoreButton from '@/components/newsfeed/LoadMoreButton';
import NewsfeedItem from '@/components/newsfeed/NewsfeedItem';
import NewsfeedItemHeader from '@/components/newsfeed/NewsfeedItemHeader';
import {
    AllCategoriesFilterName,
    FilterOptions,
    Filters,
} from '@/components/newsfeed/NewsfeedList';
import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import { RequirementCategory } from '@/database/requirement';
import { TimelineEntry, TimelineSpecialRequirementId } from '@/database/timeline';
import { TimeFormat, User } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { CategoryColors } from '@/style/ThemeProvider';
import { Scheduler } from '@jackstenglein/react-scheduler';
import { ProcessedEvent, SchedulerRef } from '@jackstenglein/react-scheduler/types';
import { CalendarMonth, FormatListBulleted } from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { DateTime } from 'luxon';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EditTimelinEntryDialog } from './EditTimelineEntryDialog';
import { UseTimelineResponse } from './useTimeline';

export function getTimeSpent(timelineItem: TimelineEntry): string {
    if (timelineItem.minutesSpent === 0) {
        return '';
    }
    const hours = Math.floor(timelineItem.minutesSpent / 60);
    const minutes = timelineItem.minutesSpent % 60;
    if (hours === 0 && minutes === 0) {
        return '';
    }
    return `${hours}h ${minutes}m`;
}

const CreatedAtItem: React.FC<{ user: User }> = ({ user }) => {
    if (!user.createdAt) {
        return null;
    }

    const entry = {
        id: 'createdAt',
        owner: user.username,
        ownerDisplayName: user.displayName,
        createdAt: user.createdAt,
        requirementId: 'CreatedAt',
        requirementName: 'CreatedAt',
        requirementCategory: RequirementCategory.Welcome,
        cohort:
            user.graduationCohorts && user.graduationCohorts.length > 0
                ? user.graduationCohorts[0]
                : user.dojoCohort,
    };

    return (
        <Card variant='outlined'>
            <CardContent>
                <Stack>
                    <NewsfeedItemHeader entry={entry as TimelineEntry} />
                    <Typography>Joined the Dojo!</Typography>
                </Stack>
            </CardContent>
        </Card>
    );
};

interface ActivityTimelineProps {
    user: User;
    timeline: UseTimelineResponse;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ user, timeline }) => {
    const { request, entries, hasMore, onLoadMore, onEdit, onDeleteEntries } = timeline;
    const [editEntry, setEditEntry] = useState<TimelineEntry>();
    const [filters, setFilters] = useState<string[]>([AllCategoriesFilterName]);
    const [numShown, setNumShown] = useState(25);
    const [view, setView] = useState('list');

    if (request.isLoading() && entries.length === 0) {
        return (
            <Stack mt={2}>
                <Typography variant='h5' alignSelf='start'>
                    Timeline
                </Typography>
                <LoadingPage />
            </Stack>
        );
    }

    const setFiltersWrapper = (proposedFilters: string[]) => {
        const addedFilters = proposedFilters.filter((filter) => !filters.includes(filter));

        let finalFilters = [];
        if (addedFilters.includes(AllCategoriesFilterName)) {
            finalFilters = [AllCategoriesFilterName];
        } else {
            finalFilters = proposedFilters.filter((filter) => filter !== AllCategoriesFilterName);
        }

        setFilters(finalFilters);
    };

    const handleLoadMore = () => {
        if (numShown < entries.length) {
            setNumShown(numShown + 25);
        } else {
            onLoadMore();
        }
    };

    const shownEntries = entries.filter((entry) =>
        filters.some((filterKey) => Filters[filterKey]?.(entry)),
    );

    return (
        <Stack mt={2} spacing={2}>
            <Stack direction='row' alignItems='center' spacing={2}>
                <Typography variant='h5'>Timeline</Typography>

                <ToggleButtonGroup size='small' value={view}>
                    <Tooltip title='List'>
                        <ToggleButton value='list' onClick={() => setView('list')}>
                            <FormatListBulleted />
                        </ToggleButton>
                    </Tooltip>

                    <Tooltip title='Calendar'>
                        <ToggleButton value='calendar' onClick={() => setView('calendar')}>
                            <CalendarMonth />
                        </ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>
            </Stack>

            <MultipleSelectChip
                selected={filters}
                setSelected={setFiltersWrapper}
                options={FilterOptions}
                label='Categories'
                error={filters.length === 0}
            />

            {entries.length === 0 ? (
                <Typography>No events yet</Typography>
            ) : view === 'list' ? (
                <ActivityTimelineList
                    user={user}
                    entries={shownEntries}
                    numShown={numShown}
                    onEdit={onEdit}
                    hasMore={hasMore}
                    handleLoadMore={handleLoadMore}
                    request={request}
                    setEditEntry={setEditEntry}
                />
            ) : (
                <ActivityTimelineCalendar
                    user={user}
                    timeline={{ ...timeline, entries: shownEntries }}
                    setEditEntry={setEditEntry}
                />
            )}

            <RequestSnackbar request={request} />

            {editEntry && (
                <EditTimelinEntryDialog
                    entry={editEntry}
                    onClose={() => setEditEntry(undefined)}
                    onDeleteEntry={(entry) => onDeleteEntries([entry])}
                />
            )}
        </Stack>
    );
};

const ActivityTimelineList = ({
    user,
    entries,
    numShown,
    onEdit,
    hasMore,
    handleLoadMore,
    request,
    setEditEntry,
}: {
    user: User;
    entries: TimelineEntry[];
    numShown: number;
    onEdit: (i: number, e: TimelineEntry) => void;
    hasMore: boolean;
    handleLoadMore: () => void;
    request: Request;
    setEditEntry: (e: TimelineEntry) => void;
}) => {
    return (
        <Stack spacing={3}>
            {entries.slice(0, numShown).map((entry, i) => (
                <NewsfeedItem
                    key={entry.id}
                    entry={entry}
                    onEdit={(e) => onEdit(i, e)}
                    maxComments={3}
                    onChangeActivity={setEditEntry}
                />
            ))}

            {(hasMore || numShown < entries.length) && (
                <LoadMoreButton
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore || numShown < entries.length}
                    request={request}
                />
            )}

            <CreatedAtItem user={user} />
        </Stack>
    );
};

const ActivityTimelineCalendar = ({
    user,
    timeline,
    setEditEntry,
}: {
    user: User;
    timeline: UseTimelineResponse;
    setEditEntry: (e: TimelineEntry) => void;
}) => {
    const filters = useFilters();
    const { entries, hasMore, onLoadMore, onEdit } = timeline;
    const calendarRef = useRef<SchedulerRef>(null);

    const initialEvents: ProcessedEvent[] = useMemo(() => {
        const minDate = calendarRef.current?.scheduler.selectedDate
            ? new Date(calendarRef.current?.scheduler.selectedDate)
            : new Date();
        minDate.setDate(-7);
        minDate.setHours(0, 0, 0, 0);

        const maxDate = calendarRef.current?.scheduler.selectedDate
            ? new Date(calendarRef.current?.scheduler.selectedDate)
            : undefined;
        maxDate?.setDate(39);
        maxDate?.setHours(0, 0, 0, 0);

        return getProcessedEvents(user, entries, minDate.toISOString(), maxDate?.toISOString());
    }, [entries, user, calendarRef]);

    useEffect(() => {
        calendarRef.current?.scheduler.handleState(initialEvents, 'events');
    }, [initialEvents, calendarRef]);

    const onSelectedDateChange = (date: Date) => {
        if (
            entries.length > 0 &&
            date.toISOString() < entries[entries.length - 1].createdAt &&
            hasMore
        ) {
            onLoadMore();
        }

        const minDate = new Date(date);
        minDate.setDate(-7);
        minDate.setHours(0, 0, 0, 0);

        const maxDate = new Date(date);
        maxDate.setDate(39);
        maxDate.setHours(0, 0, 0, 0);

        const events = getProcessedEvents(
            user,
            entries,
            minDate.toISOString(),
            maxDate.toISOString(),
        );
        calendarRef.current?.scheduler.handleState(events, 'events');
    };

    return (
        <Box
            sx={{
                '& div:has(> .rs__time)': {
                    gridTemplateColumns: 'repeat(7, 1fr) !important',
                },
                '& div:has(> .rs__today_cell):not(:has(> .rs__time))': {
                    gridTemplateColumns: '1fr !important',
                    '& span:first-child': { display: 'none !important' },
                },
                '& .rs__time': { display: 'none !important' },
            }}
        >
            <Scheduler
                ref={calendarRef}
                events={initialEvents}
                view='month'
                agenda={false}
                month={{
                    weekDays: [0, 1, 2, 3, 4, 5, 6],
                    weekStartOn: filters.weekStartOn,
                    startHour: 0,
                    endHour: 24,
                    navigation: true,
                    step: 60,
                }}
                week={{
                    weekDays: [0, 1, 2, 3, 4, 5, 6],
                    weekStartOn: filters.weekStartOn,
                    startHour: 0,
                    endHour: 0,
                    step: 0,
                    navigation: true,
                }}
                day={{
                    startHour: 0,
                    endHour: 0,
                    step: 0,
                    navigation: true,
                }}
                hourFormat={filters.timeFormat || TimeFormat.TwelveHour}
                timeZone={filters.timezone === DefaultTimezone ? undefined : filters.timezone}
                editable={false}
                customViewer={(event) =>
                    event.entry ? (
                        <NewsfeedItem
                            entry={event.entry as TimelineEntry}
                            onEdit={(e) => onEdit(entries.indexOf(event.entry as TimelineEntry), e)}
                            maxComments={3}
                            onChangeActivity={setEditEntry}
                        />
                    ) : event.user ? (
                        <CreatedAtItem user={event.user as User} />
                    ) : (
                        <></>
                    )
                }
                navigationPickerProps={{
                    disableFuture: true,
                    minDate: new Date('2023-05-01') as unknown as DateTime,
                }}
                onSelectedDateChange={onSelectedDateChange}
            />
        </Box>
    );
};

function getName(entry: TimelineEntry): string {
    if (entry.requirementId === TimelineSpecialRequirementId.GameSubmission) {
        return 'Published Game';
    }

    if (entry.requirementId === TimelineSpecialRequirementId.Graduation) {
        return `Graduation: ${entry.cohort}`;
    }

    return entry.requirementName;
}

function getProcessedEvents(
    user: User,
    entries: TimelineEntry[],
    minDate: string,
    maxDate?: string,
): ProcessedEvent[] {
    const events: ProcessedEvent[] = [];

    let i = maxDate ? binarySearch(entries, maxDate) : 0;
    for (; i < entries.length; i++) {
        const entry = entries[i];
        if ((entry.date || entry.createdAt) < minDate) {
            break;
        }

        const date = new Date(entry.date || entry.createdAt);
        const category =
            entry.requirementId === TimelineSpecialRequirementId.GameSubmission
                ? RequirementCategory.Games
                : entry.requirementCategory;

        events.push({
            event_id: entry.id,
            title: getName(entry),
            start: date,
            end: date,
            allDay: true,
            color: CategoryColors[category],
            entry,
        });
    }

    if (user.createdAt >= minDate) {
        events.push({
            event_id: 'createdAt',
            title: 'Joined the Dojo',
            start: new Date(user.createdAt),
            end: new Date(user.createdAt),
            allDay: true,
            color: CategoryColors[RequirementCategory.Welcome],
            user,
        });
    }

    return events;
}

/** Uses binary search to find the index of the first timeline entry with a date less than maxDate. */
function binarySearch(arr: TimelineEntry[], maxDate: string): number {
    let low = 0;
    let high = arr.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);

        if ((arr[mid].date || arr[mid].createdAt) <= maxDate) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    return high + 1;
}

export default ActivityTimeline;
