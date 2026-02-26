import { EventType as AnalyticsEventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useCache } from '@/api/cache/Cache';
import { useRequiredAuth } from '@/auth/Auth';
import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import {
    AvailabilityType,
    Event,
    EventType,
    getDefaultNumberOfParticipants,
    getDisplayString,
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
import { forwardRef, JSX } from 'react';
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
    UseEventEditorResponse,
} from './useEventEditor';

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

    const cache = useCache();
    const request = useRequest();

    const editor = useEventEditor(defaultStart, defaultEnd, originalEvent?.event as Event);

    const onSubmit = async () => {
        const [event, errors] = validateEventEditor(user, originalEvent, editor);
        editor.setErrors(errors);
        if (Object.entries(errors).length > 0 || !event) {
            return;
        }

        request.onStart();
        try {
            scheduler.loading(true);
            const response = await api.setEvent(event);
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
        <Dialog data-testid='event-editor' fullScreen open={true} TransitionComponent={Transition}>
            <RequestSnackbar request={request} />

            <AppBar sx={{ position: 'relative' }}>
                <Toolbar sx={{ gap: 1 }}>
                    <TextField
                        variant='standard'
                        placeholder='Add title'
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
                        Cancel
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
                        Save
                    </Button>
                </Toolbar>
            </AppBar>

            <DialogContent sx={{ my: 2 }}>
                <Grid container columnSpacing={6} rowSpacing={9}>
                    <Grid
                        size={{ xs: 12, lg: 6 }}
                        sx={{ display: 'flex', flexDirection: 'column', rowGap: 4 }}
                    >
                        <Typography variant='h6'>Event Details</Typography>

                        {(user.isAdmin || user.isCalendarAdmin || user.isCoach) && (
                            <Stack direction='row' gap={2} flexWrap='wrap' alignItems='center'>
                                <Select
                                    value={editor.type}
                                    onChange={(e) =>
                                        editor.setType(e.target.value as EditableEventType)
                                    }
                                    sx={{ flexGrow: 1 }}
                                >
                                    <MenuItem value={EventType.Availability}>
                                        <Stack direction='row' alignItems='center'>
                                            <Icon
                                                name='meet'
                                                color='book'
                                                sx={{ mr: '0.4rem', verticalAlign: 'medium' }}
                                            />{' '}
                                            Bookable Availability
                                        </Stack>
                                    </MenuItem>

                                    {(user.isAdmin || user.isCalendarAdmin) && (
                                        <MenuItem value={EventType.Dojo}>
                                            <Stack direction='row' alignItems='center'>
                                                <Icon
                                                    name='Dojo Events'
                                                    color='dojoOrange'
                                                    sx={{ mr: '0.4rem', verticalAlign: 'medium' }}
                                                />{' '}
                                                Dojo Event
                                            </Stack>
                                        </MenuItem>
                                    )}
                                    {user.isCoach && (
                                        <MenuItem value={EventType.Coaching}>
                                            <Stack direction='row' alignItems='center'>
                                                <Icon
                                                    name='Coaching Sessions'
                                                    color='coaching'
                                                    sx={{ mr: '0.4rem', verticalAlign: 'medium' }}
                                                />{' '}
                                                Coaching Session
                                            </Stack>
                                        </MenuItem>
                                    )}
                                    {user.isAdmin && [
                                        <MenuItem
                                            key={EventType.LectureTier}
                                            value={EventType.LectureTier}
                                        >
                                            <Stack direction='row' alignItems='center'>
                                                <PresenterIcon
                                                    color='success'
                                                    sx={{
                                                        mr: '0.4rem',
                                                        verticalAlign: 'medium',
                                                        fontSize: '24px',
                                                    }}
                                                />{' '}
                                                Group Lecture
                                            </Stack>
                                        </MenuItem>,
                                        <MenuItem
                                            key={EventType.GameReviewTier}
                                            value={EventType.GameReviewTier}
                                        >
                                            <Stack direction='row' alignItems='center'>
                                                <Troubleshoot
                                                    color='info'
                                                    sx={{ mr: '0.4rem', verticalAlign: 'medium' }}
                                                />{' '}
                                                Game & Profile Review
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
                        <Typography variant='h6'>Guests</Typography>

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

const classConfig: FormConfig = {
    details: [
        { type: 'times', enableRecurrence: true, getMinEnd: () => null },
        {
            type: 'location',
            required: true,
            helperText:
                'Add a Zoom link, specify a Discord classroom, etc. This is how your students will access your lesson and will only be visible after they pay.',
        },
        {
            type: 'description',
            required: true,
        },
    ],
    guests: [
        {
            type: 'cohorts',
            helperText:
                'Choose the cohorts that can see this event. If no cohorts are selected, all cohorts will be able to view the event.',
            placeholder: 'Choose cohorts',
        },
    ],
};

const formConfigs: Record<EditableEventType, FormConfig> = {
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
                              (t) => availabilityTypes[t as AvailabilityType],
                          );

                    const onChangeType = (newTypes: string[]) => {
                        const addedTypes = newTypes.filter((t) => !selectedTypes.includes(t));
                        if (addedTypes.includes(AllTypes)) {
                            setAllAvailabilityTypes(true);
                            Object.values(AvailabilityTypes).forEach((t) =>
                                setAvailabilityType(t, false),
                            );
                        } else {
                            setAllAvailabilityTypes(false);
                            Object.values(AvailabilityTypes).forEach((t) =>
                                setAvailabilityType(t, false),
                            );
                            newTypes.forEach((t) => {
                                if (t !== AllTypes) {
                                    setAvailabilityType(t as AvailabilityType, true);
                                }
                            });
                        }
                    };

                    return (
                        <MultipleSelectChip
                            displayEmpty='Select Meeting Types'
                            selected={selectedTypes}
                            setSelected={onChangeType}
                            options={Object.values(AvailabilityType).map((t) => ({
                                value: t,
                                label: getDisplayString(t),
                                icon: <Icon name={t} color='primary' />,
                            }))}
                            error={Boolean(editor.errors.types)}
                            helperText={
                                editor.errors.types ||
                                'Choose the meeting types you are available for.'
                            }
                            data-testid='availability-type-selector'
                        />
                    );
                },
            },
            {
                type: 'location',
                helperText: `Add a Zoom link, specify a Discord classroom, etc. Defaults to "Discord" if left blank.`,
            },
            {
                type: 'description',
                subtitle: 'Add a sparring position or any other notes for your opponent.',
            },
        ],
        guests: [
            { type: 'invite' },
            {
                type: 'cohorts',
                placeholder: 'Choose cohorts',
                helperText: 'Choose the cohorts that can book your availability.',
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
                    return `The number of people that can book your availability (not including yourself). Defaults to ${defaultMaxParticipants} if left blank.`;
                },
            },
        ],
    },
    [EventType.Dojo]: {
        details: [
            { type: 'times', enableRecurrence: true, getMinEnd: () => null },
            {
                type: 'location',
                helperText: `Add a Zoom link, specify a Discord classroom, etc. Defaults to "No Location Provided" if left blank.`,
            },
            { type: 'description' },
        ],
        guests: [
            {
                type: 'cohorts',
                helperText:
                    'Choose the cohorts that can see this event. If no cohorts are selected, all cohorts will be able to view the event.',
                placeholder: 'Choose cohorts',
            },
        ],
    },
    [EventType.Coaching]: {
        details: [
            { type: 'times', enableRecurrence: true, getMinEnd: () => null },
            {
                type: 'location',
                required: true,
                helperText:
                    'Add a Zoom link, specify a Discord classroom, etc. This is how your students will access your lesson and will only be visible after they pay.',
            },
            {
                type: 'description',
                subtitle:
                    'This description will be visible in the calendar and should describe what your coaching session will cover.',
                required: true,
            },
            { type: 'pricing' },
        ],
        guests: [
            {
                type: 'cohorts',
                helperText:
                    'Choose the cohorts that can see this event. If no cohorts are selected, all cohorts will be able to view the event.',
                placeholder: 'Choose cohorts',
            },
            {
                type: 'maxParticipants',
                helperText: 'The maximum number of students that can book your coaching session.',
            },
        ],
    },
    [EventType.LectureTier]: classConfig,
    [EventType.GameReviewTier]: classConfig,
};
