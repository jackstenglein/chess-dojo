import { EventType as AnalyticsEventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useCache } from '@/api/cache/Cache';
import { useRequiredAuth } from '@/auth/Auth';
import { useRecurrenceEditPrompt } from '@/components/calendar/EditRecurrenceDialog';
import {
    haveTimesChanged,
    isRecurringEvent,
    moveSingleOccurrence,
} from '@/components/calendar/recurrence';
import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import {
    AvailabilityType,
    Event,
    EventType,
    getDefaultNumberOfParticipants,
    getDisplayString,
    getEventDurationMs,
    getEventEnd,
    getEventStart,
} from '@/database/event';
import { User } from '@/database/user';
import Icon from '@/style/Icon';
import { PresenterIcon } from '@/style/PresenterIcon';
import { SchedulerHelpers } from '@jackstenglein/react-scheduler/types';
import { Troubleshoot } from '@mui/icons-material';
import {
    AppBar,
    Button,
    Dialog,
    DialogContent,
    Grid,
    MenuItem,
    Select,
    Slide,
    Stack,
    TextField,
    Toolbar,
    Typography,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { forwardRef, JSX } from 'react';
import { RRuleSet, rrulestr } from 'rrule';
import { validateEventEditor } from './eventValidation';
import CohortsFormSection from './form/CohortsFormSection';
import { ColorFormSection } from './form/ColorFormSection';
import DescriptionFormSection from './form/DescriptionFormSection';
import { InviteFormSection } from './form/InviteFormSection';
import LocationFormSection from './form/LocationFormSection';
import MaxParticipantsFormSection from './form/MaxParticipantsFormSection';
import { PricingFormSection } from './form/PricingFormSection';
import TimesFormSection from './form/TimesFormSection';
import useEventEditor, {
    EditableEventType,
    getMinEnd,
    RRuleEnds,
    UseEventEditorResponse,
} from './useEventEditor';

function haveRecurrenceOptionsChanged(
    original: Event | undefined,
    editor: UseEventEditorResponse,
): boolean {
    if (!original?.rrule) {
        return Boolean(editor.rruleOptions.freq);
    }

    try {
        const parsed = rrulestr(original.rrule, { forceset: true });
        const options =
            parsed instanceof RRuleSet
                ? (parsed.rrules()[0]?.origOptions ?? {})
                : parsed.origOptions;
        const originalEnds = options.count
            ? RRuleEnds.Count
            : options.until
              ? RRuleEnds.Until
              : RRuleEnds.Never;

        if (options.freq !== editor.rruleOptions.freq) {
            return true;
        }
        if (originalEnds !== editor.rruleOptions.ends) {
            return true;
        }
        if (
            editor.rruleOptions.ends === RRuleEnds.Count &&
            (options.count ?? undefined) !== editor.rruleOptions.count
        ) {
            return true;
        }
        if (editor.rruleOptions.ends === RRuleEnds.Until) {
            const originalUntil = options.until?.getTime();
            const editorUntil = editor.rruleOptions.until?.toJSDate().getTime();
            if (originalUntil !== editorUntil) {
                return true;
            }
        }
        return false;
    } catch {
        return true;
    }
}

const Transition = forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction='up' ref={ref} {...props} />;
});

interface EventEditorProps {
    scheduler: SchedulerHelpers;
}

const EventEditor: React.FC<EventEditorProps> = ({ scheduler }) => {
    const originalEvent = scheduler.edited;
    const defaultStart = scheduler.state.start.value as Date;
    const defaultEnd = scheduler.state.end.value as Date;

    const api = useApi();
    const { user } = useRequiredAuth();
    const t = useTranslations('calendar');
    const labelT = useTranslations('eventLabels');

    const cache = useCache();
    const request = useRequest();
    const { prompt: promptRecurrenceEdit, dialog: recurrenceEditDialog } =
        useRecurrenceEditPrompt();

    const editor = useEventEditor(defaultStart, defaultEnd, originalEvent?.event as Event);
    const formConfigs = getFormConfigs(t, labelT);

    const onSubmit = async () => {
        const [event, errors] = validateEventEditor(user, originalEvent, editor, t);
        editor.setErrors(errors);
        if (Object.entries(errors).length > 0 || !event) {
            return;
        }

        const originalDojoEvent = originalEvent?.event as Event | undefined;
        const timesChanged = haveTimesChanged(
            defaultStart,
            defaultEnd,
            getEventStart(event),
            getEventEnd(event),
        );
        const isRecurringEdit =
            Boolean(originalDojoEvent && isRecurringEvent(originalDojoEvent)) &&
            Boolean(originalDojoEvent?.id) &&
            timesChanged &&
            !haveRecurrenceOptionsChanged(originalDojoEvent, editor);

        let eventToSave = event;
        if (isRecurringEdit && originalDojoEvent) {
            const scope = await promptRecurrenceEdit();
            if (scope === 'cancel') {
                return;
            }

            if (scope === 'this') {
                const { startTime: _s, endTime: _e, ...rest } = event;
                eventToSave = {
                    ...rest,
                    durationMs: getEventDurationMs(originalDojoEvent),
                    rrule: moveSingleOccurrence(
                        originalDojoEvent,
                        defaultStart,
                        getEventStart(event),
                    ),
                };
            }
            // scope === 'all' keeps the validated event (new times + rebuilt rrule)
        }

        request.onStart();
        try {
            scheduler.loading(true);
            const response = await api.setEvent(eventToSave);
            const newEvent = response.data;

            trackEvent(AnalyticsEventType.SetAvailability, {
                availability_id: newEvent.id,
                type: newEvent.type,
                title: newEvent.title,
                availability_types: newEvent.types,
                availability_cohorts: newEvent.cohorts,
                max_participants: newEvent.maxParticipants,
            });
            cache.events.put(newEvent);
            request.onSuccess();
            scheduler.close();
        } catch (err) {
            request.onFailure(err);
        } finally {
            scheduler.loading(false);
        }
    };

    return (
        <Dialog
            data-testid='event-editor'
            fullScreen
            open={true}
            slots={{ transition: Transition }}
        >
            <RequestSnackbar request={request} />
            {recurrenceEditDialog}

            <AppBar sx={{ position: 'relative' }}>
                <Toolbar sx={{ gap: 1 }}>
                    <TextField
                        variant='standard'
                        placeholder={t('addTitle')}
                        value={editor.title}
                        onChange={(e) => editor.setTitle(e.target.value)}
                        error={Boolean(editor.errors.title)}
                        helperText={editor.errors.title}
                        sx={{ fontSize: '1.5rem', mr: 5, flexGrow: 1 }}
                        data-testid='event-title-textfield'
                    />

                    <Button
                        data-testid='cancel-button'
                        color='error'
                        onClick={() => scheduler.close()}
                        disabled={request.isLoading()}
                        startIcon={<Icon name='cancel' />}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        data-testid='save-button'
                        color='success'
                        loading={request.isLoading()}
                        onClick={() => {
                            void onSubmit();
                        }}
                        startIcon={<Icon name='save' />}
                    >
                        {t('save')}
                    </Button>
                </Toolbar>
            </AppBar>

            <DialogContent sx={{ my: 2 }}>
                <Grid container columnSpacing={6} rowSpacing={9}>
                    <Grid
                        size={{ xs: 12, lg: 6 }}
                        sx={{ display: 'flex', flexDirection: 'column', rowGap: 4 }}
                    >
                        <Typography variant='h6'>{t('eventDetails')}</Typography>

                        {(user.isAdmin || user.isCalendarAdmin || user.isCoach) && (
                            <Stack
                                direction='row'
                                sx={{
                                    gap: 2,
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                }}
                            >
                                <Select
                                    value={editor.type}
                                    onChange={(e) => editor.setType(e.target.value)}
                                    sx={{ flexGrow: 1 }}
                                >
                                    <MenuItem value={EventType.Availability}>
                                        <Stack
                                            direction='row'
                                            sx={{
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Icon
                                                name='meet'
                                                color='book'
                                                sx={{ mr: '0.4rem', verticalAlign: 'medium' }}
                                            />{' '}
                                            {t('bookableAvailability')}
                                        </Stack>
                                    </MenuItem>

                                    {(user.isAdmin || user.isCalendarAdmin) && (
                                        <MenuItem value={EventType.Dojo}>
                                            <Stack
                                                direction='row'
                                                sx={{
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Icon
                                                    name='Dojo Events'
                                                    color='dojoOrange'
                                                    sx={{ mr: '0.4rem', verticalAlign: 'medium' }}
                                                />{' '}
                                                {t('dojoEvent')}
                                            </Stack>
                                        </MenuItem>
                                    )}
                                    {user.isCoach && (
                                        <MenuItem value={EventType.Coaching}>
                                            <Stack
                                                direction='row'
                                                sx={{
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Icon
                                                    name='Coaching Sessions'
                                                    color='coaching'
                                                    sx={{ mr: '0.4rem', verticalAlign: 'medium' }}
                                                />{' '}
                                                {t('coachingSession')}
                                            </Stack>
                                        </MenuItem>
                                    )}
                                    {user.isAdmin && [
                                        <MenuItem
                                            key={EventType.LectureTier}
                                            value={EventType.LectureTier}
                                        >
                                            <Stack
                                                direction='row'
                                                sx={{
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <PresenterIcon
                                                    color='success'
                                                    sx={{
                                                        mr: '0.4rem',
                                                        verticalAlign: 'medium',
                                                        fontSize: '24px',
                                                    }}
                                                />{' '}
                                                {t('groupLecture')}
                                            </Stack>
                                        </MenuItem>,
                                        <MenuItem
                                            key={EventType.GameReviewTier}
                                            value={EventType.GameReviewTier}
                                        >
                                            <Stack
                                                direction='row'
                                                sx={{
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Troubleshoot
                                                    color='info'
                                                    sx={{ mr: '0.4rem', verticalAlign: 'medium' }}
                                                />{' '}
                                                {t('gameProfileReview')}
                                            </Stack>
                                        </MenuItem>,
                                    ]}
                                </Select>

                                <ColorFormSection editor={editor} />
                            </Stack>
                        )}

                        {formConfigs[editor.type].details.map((config, i) => (
                            <FormSection key={i} config={config} editor={editor} user={user} />
                        ))}
                    </Grid>

                    <Grid
                        size={{ xs: 12, lg: 6 }}
                        sx={{ display: 'flex', flexDirection: 'column', rowGap: 4 }}
                    >
                        <Typography variant='h6'>{t('guests')}</Typography>

                        {formConfigs[editor.type].guests.map((config, i) => (
                            <FormSection key={i} config={config} editor={editor} user={user} />
                        ))}
                    </Grid>
                </Grid>
            </DialogContent>
        </Dialog>
    );
};

export default EventEditor;

function FormSection({
    config,
    editor,
    user,
}: {
    config: FormConfigSection;
    editor: UseEventEditorResponse;
    user: User;
}) {
    {
        switch (config.type) {
            case 'times':
                return (
                    <TimesFormSection
                        enableRecurrence={config.enableRecurrence}
                        start={editor.start}
                        setStart={editor.setStart}
                        startError={editor.errors.start}
                        end={editor.end}
                        setEnd={editor.setEnd}
                        endError={editor.errors.end}
                        minEnd={config.getMinEnd(editor.start)}
                        rruleOptions={editor.rruleOptions}
                        setRRuleOptions={editor.setRRuleOptions}
                        countError={editor.errors.count}
                    />
                );
            case 'location':
                return (
                    <LocationFormSection
                        required={config.required}
                        location={editor.location}
                        setLocation={editor.setLocation}
                        helperText={config.helperText}
                        error={editor.errors.location}
                    />
                );
            case 'description':
                return (
                    <DescriptionFormSection
                        required={config.required}
                        description={editor.description}
                        setDescription={editor.setDescription}
                        error={editor.errors.description}
                    />
                );
            case 'maxParticipants':
                return (
                    <MaxParticipantsFormSection
                        maxParticipants={editor.maxParticipants}
                        setMaxParticipants={editor.setMaxParticipants}
                        helperText={config.getHelperText?.(editor) ?? config.helperText}
                        error={editor.errors.maxParticipants}
                    />
                );
            case 'invite':
                return <InviteFormSection owner={user.username} {...editor} />;
            case 'cohorts':
                return editor.inviteOnly ? null : (
                    <CohortsFormSection
                        placeholder={config.placeholder}
                        helperText={config.helperText}
                        allCohorts={editor.allCohorts}
                        setAllCohorts={editor.setAllCohorts}
                        cohorts={editor.cohorts}
                        setCohort={editor.setCohort}
                        error={editor.errors.cohorts}
                    />
                );
            case 'pricing':
                return (
                    <PricingFormSection
                        editor={editor}
                        fullPriceOpts={config.fullPriceOpts}
                        currentPriceOpts={config.currentPriceOpts}
                    />
                );
            case 'color':
                return <ColorFormSection editor={editor} />;
            case 'custom':
                return <config.element editor={editor} />;
        }
    }
}

interface TimesFormConfig {
    type: 'times';
    enableRecurrence?: boolean;
    getMinEnd: (start: DateTime | null) => DateTime | null;
}

interface TitleFormConfig {
    type: 'title';
    label?: string;
    subtitle?: string;
}

interface LocationFormConfig {
    type: 'location';
    helperText?: string;
    required?: boolean;
}

interface DescriptionFormConfig {
    type: 'description';
    subtitle?: string;
    required?: boolean;
}

interface MaxParticipantsFormConfig {
    type: 'maxParticipants';
    helperText?: string;
    getHelperText?: (editor: UseEventEditorResponse) => string;
}

interface InviteFormConfig {
    type: 'invite';
}

interface CohortsFormConfig {
    type: 'cohorts';
    placeholder: string;
    helperText: string;
}

interface PricingFormConfig {
    type: 'pricing';
    fullPriceOpts?: { helperText?: string };
    currentPriceOpts?: { helperText?: string };
}

interface ColorFormConfig {
    type: 'color';
}

interface CustomFormConfig {
    type: 'custom';
    element: (props: { editor: UseEventEditorResponse }) => JSX.Element;
}

type FormConfigSection =
    | TimesFormConfig
    | TitleFormConfig
    | LocationFormConfig
    | DescriptionFormConfig
    | MaxParticipantsFormConfig
    | InviteFormConfig
    | CohortsFormConfig
    | PricingFormConfig
    | ColorFormConfig
    | CustomFormConfig;

interface FormConfig {
    details: FormConfigSection[];
    guests: FormConfigSection[];
}

function getClassConfig(t: ReturnType<typeof useTranslations<'calendar'>>): FormConfig {
    return {
        details: [
            { type: 'times', enableRecurrence: true, getMinEnd: () => null },
            {
                type: 'location',
                required: true,
                helperText: t('classLocationHelp'),
            },
            {
                type: 'description',
                required: true,
            },
        ],
        guests: [
            {
                type: 'cohorts',
                helperText: t('classCohortsHelp'),
                placeholder: t('chooseCohorts'),
            },
        ],
    };
}

function getFormConfigs(
    t: ReturnType<typeof useTranslations<'calendar'>>,
    labelT: ReturnType<typeof useTranslations<'eventLabels'>>,
): Record<EditableEventType, FormConfig> {
    const classConfig = getClassConfig(t);
    return {
        [EventType.Availability]: {
            details: [
                {
                    type: 'times',
                    getMinEnd,
                },
                {
                    type: 'custom',
                    element({ editor }) {
                        const { AllTypes, ...AvailabilityTypes } = AvailabilityType;

                        const {
                            allAvailabilityTypes,
                            setAllAvailabilityTypes,
                            availabilityTypes,
                            setAvailabilityType,
                        } = editor;

                        const selectedTypes = allAvailabilityTypes
                            ? [AllTypes]
                            : Object.keys(availabilityTypes).filter(
                                  (at) => availabilityTypes[at as AvailabilityType],
                              );

                        const onChangeType = (newTypes: string[]) => {
                            const addedTypes = newTypes.filter((at) => !selectedTypes.includes(at));
                            if (addedTypes.includes(AllTypes)) {
                                setAllAvailabilityTypes(true);
                                Object.values(AvailabilityTypes).forEach((at) =>
                                    setAvailabilityType(at, false),
                                );
                            } else {
                                setAllAvailabilityTypes(false);
                                Object.values(AvailabilityTypes).forEach((at) =>
                                    setAvailabilityType(at, false),
                                );
                                newTypes.forEach((at) => {
                                    if (at !== AllTypes) {
                                        setAvailabilityType(at as AvailabilityType, true);
                                    }
                                });
                            }
                        };

                        return (
                            <MultipleSelectChip
                                displayEmpty={t('selectMeetingTypes')}
                                selected={selectedTypes}
                                setSelected={onChangeType}
                                options={Object.values(AvailabilityType).map((at) => ({
                                    value: at,
                                    label: getDisplayString(at, labelT),
                                    icon: <Icon name={at} color='primary' />,
                                }))}
                                error={Boolean(editor.errors.types)}
                                helperText={editor.errors.types || t('chooseMeetingTypes')}
                                data-testid='availability-type-selector'
                            />
                        );
                    },
                },
                {
                    type: 'location',
                    helperText: t('availabilityLocationHelp'),
                },
                {
                    type: 'description',
                    subtitle: t('sparringDescription'),
                },
            ],
            guests: [
                { type: 'invite' },
                {
                    type: 'cohorts',
                    placeholder: t('chooseCohorts'),
                    helperText: t('availabilityCohortsHelp'),
                },
                {
                    type: 'maxParticipants',
                    getHelperText: (editor) => {
                        let defaultMaxParticipants = 1;
                        if (editor.allAvailabilityTypes) {
                            defaultMaxParticipants = 100;
                        } else {
                            Object.entries(editor.availabilityTypes).forEach(([type, enabled]) => {
                                if (enabled) {
                                    defaultMaxParticipants = Math.max(
                                        defaultMaxParticipants,
                                        getDefaultNumberOfParticipants(type as AvailabilityType),
                                    );
                                }
                            });
                        }
                        return t('availabilityMaxParticipantsHelp', {
                            default: defaultMaxParticipants,
                        });
                    },
                },
            ],
        },
        [EventType.Dojo]: {
            details: [
                { type: 'times', enableRecurrence: true, getMinEnd: () => null },
                {
                    type: 'location',
                    helperText: t('dojoLocationHelp'),
                },
                { type: 'description' },
            ],
            guests: [
                {
                    type: 'cohorts',
                    helperText: t('classCohortsHelp'),
                    placeholder: t('chooseCohorts'),
                },
            ],
        },
        [EventType.Coaching]: {
            details: [
                { type: 'times', enableRecurrence: true, getMinEnd: () => null },
                {
                    type: 'location',
                    required: true,
                    helperText: t('classLocationHelp'),
                },
                {
                    type: 'description',
                    subtitle: t('coachingDescriptionHelp'),
                    required: true,
                },
                { type: 'pricing' },
            ],
            guests: [
                {
                    type: 'cohorts',
                    helperText: t('classCohortsHelp'),
                    placeholder: t('chooseCohorts'),
                },
                {
                    type: 'maxParticipants',
                    helperText: t('coachingMaxParticipantsHelp'),
                },
            ],
        },
        [EventType.LectureTier]: classConfig,
        [EventType.GameReviewTier]: classConfig,
    };
}
