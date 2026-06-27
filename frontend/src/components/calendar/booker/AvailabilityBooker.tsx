import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, RequestStatus, useRequest } from '@/api/Request';
import { useCache } from '@/api/cache/Cache';
import { useAuth } from '@/auth/Auth';
import {
    getTimeZonedDate,
    toDojoDateString,
    toDojoTimeString,
} from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import { AvailabilityType, Event, getDisplayString } from '@/database/event';
import { TimeFormat } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import Icon from '@/style/Icon';
import {
    AppBar,
    Button,
    Dialog,
    DialogContent,
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    Radio,
    RadioGroup,
    Slide,
    Stack,
    Toolbar,
    Typography,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { TimePicker } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import Field from '../eventViewer/Field';
import OwnerField from '../eventViewer/OwnerField';

export const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction='up' ref={ref} {...props} />;
});

interface AvailabilityBookerProps {
    availability: Event;
}

const AvailabilityBooker: React.FC<AvailabilityBookerProps> = ({ availability }) => {
    const t = useTranslations('calendar');
    const labelT = useTranslations('eventLabels');
    const request = useRequest();
    const api = useApi();
    const cache = useCache();
    const user = useAuth().user;
    const router = useRouter();

    const [selectedType, setSelectedType] = useState<AvailabilityType | null>(null);
    const [startTime, setStartTime] = useState<DateTime | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const timezone = user?.timezoneOverride;
    const timeFormat = user?.timeFormat || TimeFormat.TwelveHour;

    useEffect(() => {
        if (availability) {
            setStartTime(
                DateTime.fromJSDate(getTimeZonedDate(new Date(availability.startTime), timezone)),
            );
        }
    }, [availability, setStartTime, timezone]);

    const isGroup = availability.maxParticipants > 1;
    const minStartTime = new Date(availability.startTime);
    const maxStartTime = new Date(availability.endTime);

    const minStartDate = toDojoDateString(minStartTime, timezone);
    const minStartStr = toDojoTimeString(minStartTime, timezone, timeFormat);
    const maxStartStr = toDojoTimeString(maxStartTime, timezone, timeFormat);

    const confirmSoloBooking = () => {
        const newErrors: Record<string, string> = {};

        if (selectedType === null) {
            newErrors.type = t('selectMeetingType');
        }

        let selectedTime: Date | undefined = undefined;
        if (startTime === null) {
            newErrors.time = t('selectTime');
        } else {
            selectedTime = getTimeZonedDate(startTime.toJSDate(), timezone, 'forward');
            if (
                selectedTime.toISOString() < availability.startTime ||
                selectedTime.toISOString() > availability.endTime
            ) {
                newErrors.time = t('mustBeBetween', { start: minStartStr, end: maxStartStr });
            }
        }

        setErrors(newErrors);
        if (Object.entries(newErrors).length > 0) {
            return;
        }
        if (!selectedTime || !selectedType) {
            return;
        }

        request.onStart();
        api.bookEvent(availability.id, selectedTime, selectedType)
            .then((response) => {
                trackEvent(EventType.BookAvailability, {
                    availability_id: availability.id,
                    is_group: false,
                    selected_type: selectedType,
                    availability_types: availability.types,
                    availability_cohorts: availability.cohorts,
                });
                request.onSuccess();
                cache.events.put(response.data.event);
                router.push(`/meeting/${response.data.event.id}`);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    const confirmGroupBooking = () => {
        request.onStart();
        api.bookEvent(availability.id)
            .then((response) => {
                trackEvent(EventType.BookAvailability, {
                    availability_id: availability.id,
                    is_group: true,
                    availability_types: availability.types,
                    availability_cohorts: availability.cohorts,
                    max_participants: availability.maxParticipants,
                });
                request.onSuccess();
                cache.events.put(response.data.event);
                router.push(`/meeting/${response.data.event.id}`);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    const confirmBooking = () => {
        if (isGroup) {
            confirmGroupBooking();
            return;
        }
        confirmSoloBooking();
    };

    return (
        <Dialog
            data-testid='availability-booker'
            fullScreen
            open={true}
            TransitionComponent={Transition}
        >
            <RequestSnackbar request={request} />

            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <Typography sx={{ ml: 2, flex: 1 }} variant='h6' component='div'>
                        {isGroup ? t('joinGroupMeeting') : t('bookMeeting')}
                    </Typography>
                    <Button
                        data-testid='cancel-button'
                        color='error'
                        href='/calendar'
                        disabled={request.status === RequestStatus.Loading}
                        startIcon={<Icon name='cancel' />}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        data-testid='book-button'
                        color='success'
                        loading={request.status === RequestStatus.Loading}
                        onClick={confirmBooking}
                        startIcon={<Icon name='join' />}
                    >
                        {isGroup ? t('join') : t('book')}
                    </Button>
                </Toolbar>
            </AppBar>
            <DialogContent>
                <Stack sx={{ pt: 2 }} spacing={3}>
                    <Field
                        iconName='clock'
                        title={isGroup ? t('time') : t('availableStartTimes')}
                        body={t('timeRange', {
                            date: minStartDate,
                            start: minStartStr,
                            end: maxStartStr,
                        })}
                    />
                    <OwnerField title={t('owner')} event={availability} />

                    <Field
                        title={t('location')}
                        body={availability.location || t('discord')}
                        iconName='location'
                    />

                    {availability.description && (
                        <Stack>
                            <Typography variant='h6' color='text.secondary'>
                                <Icon
                                    name='notes'
                                    color='primary'
                                    sx={{
                                        marginRight: '0.5rem',
                                        verticalAlign: 'middle',
                                    }}
                                />
                                {t('description')}
                            </Typography>
                            <Typography variant='body1' style={{ whiteSpace: 'pre-line' }}>
                                {availability.description}
                            </Typography>
                        </Stack>
                    )}

                    {isGroup && (
                        <>
                            <Field
                                iconName='meet'
                                title={t('meetingTypes')}
                                body={availability.types
                                    ?.map((type) => getDisplayString(type, labelT))
                                    .join(', ')}
                            />

                            <Field
                                iconName='cohort'
                                title={t('cohorts')}
                                body={availability.cohorts.join(', ')}
                            />

                            <Field
                                iconName='line'
                                title={t('maxParticipants')}
                                body={`${availability.maxParticipants}`}
                            />

                            <Stack>
                                <Typography variant='h6' color='text.secondary'>
                                    <Icon
                                        name='participant'
                                        color='primary'
                                        sx={{
                                            marginRight: '0.5rem',
                                            verticalAlign: 'middle',
                                        }}
                                    />
                                    {t('currentParticipants')}
                                </Typography>

                                {Object.values(availability.participants).length === 0 && (
                                    <Typography variant='body1'>{t('none')}</Typography>
                                )}

                                {Object.values(availability.participants).map((p) => (
                                    <Stack
                                        key={p.username}
                                        direction='row'
                                        spacing={1}
                                        alignItems='center'
                                    >
                                        <Avatar
                                            username={p.username}
                                            displayName={p.displayName}
                                            size={25}
                                        />
                                        <Link key={p.username} href={`/profile/${p.username}`}>
                                            <Typography variant='body1'>
                                                {p.displayName} ({p.cohort})
                                            </Typography>
                                        </Link>
                                        <CohortIcon cohort={p.previousCohort} size={22} />
                                    </Stack>
                                ))}
                            </Stack>
                        </>
                    )}

                    {!isGroup && (
                        <>
                            <FormControl error={!!errors.type}>
                                <FormLabel>{t('meetingType')}</FormLabel>
                                <RadioGroup
                                    name='radio-buttons-group'
                                    value={selectedType}
                                    onChange={(event) =>
                                        setSelectedType(event.target.value as AvailabilityType)
                                    }
                                >
                                    {availability.types?.map((type) => (
                                        <FormControlLabel
                                            key={type}
                                            control={<Radio data-testid='meeting-type-radio' />}
                                            value={type}
                                            label={getDisplayString(type, labelT)}
                                        />
                                    ))}
                                </RadioGroup>
                                <FormHelperText>{errors.type}</FormHelperText>
                            </FormControl>

                            <TimePicker
                                label={t('startTime')}
                                value={startTime}
                                onChange={(value) => setStartTime(value)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: !!errors.time,
                                        helperText:
                                            errors.time ||
                                            t('mustBeBetween', {
                                                start: minStartStr,
                                                end: maxStartStr,
                                            }),
                                    },
                                }}
                                minTime={DateTime.fromISO(availability.startTime)}
                                maxTime={DateTime.fromISO(availability.endTime)}
                                ampm={timeFormat === TimeFormat.TwelveHour}
                            />
                        </>
                    )}
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

export default AvailabilityBooker;
