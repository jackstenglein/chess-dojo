import {
    AvailabilityType,
    Event,
    EventStatus,
    EventType,
    getDefaultNumberOfParticipants,
} from '@/database/event';
import { dojoCohorts, User } from '@/database/user';
import { ProcessedEvent } from '@jackstenglein/react-scheduler/types';
import { DateTime } from 'luxon';
import { Options, RRule } from 'rrule';
import { getTimeZonedDate } from '../displayDate';
import {
    getDefaultRRuleCount,
    getMinEnd,
    RRuleEnds,
    UseEventEditorResponse,
} from './useEventEditor';

type TranslateFn = (key: string) => string;

/**
 * Validates the times in the event editor.
 * @param editor The editor to validate.
 * @param errors The object to set errors on.
 * @param minEnd The minimum valid end date.
 */
function validateTimes(
    editor: UseEventEditorResponse,
    errors: Record<string, string>,
    t: TranslateFn,
    minEnd?: DateTime | null,
) {
    if (editor.start === null) {
        errors.start = t('validationRequired');
    } else if (!editor.start.isValid) {
        errors.start = t('validationStartInvalid');
    }

    if (editor.end === null) {
        errors.end = t('validationRequired');
    } else if (!editor.end.isValid) {
        errors.end = t('validationEndInvalid');
    } else if (minEnd && editor.end < minEnd) {
        errors.end = t('validationEndTooEarly');
    }
}

/**
 * Validates that the given field is not empty.
 * @param editor The event editor to validate.
 * @param field The field to validate.
 * @param errors The object to set errors on.
 */
function requireField(
    editor: UseEventEditorResponse,
    field: keyof UseEventEditorResponse,
    errors: Record<string, string>,
    t: TranslateFn,
) {
    const value = editor[field];
    if (typeof value === 'string' && !value.trim()) {
        errors[field] = t('validationRequired');
    } else if (typeof value === 'number' && value < 0) {
        errors[field] = t('validationRequired');
    }
}

/**
 * Validates the maxParticipants field of the event editor.
 * @param editor The event editor to validate.
 * @param errors The object to set errors on.
 * @returns The validated maxParticipants value.
 */
function requireMaxParticipants(
    editor: UseEventEditorResponse,
    errors: Record<string, string>,
    t: TranslateFn,
): number {
    if (!editor.maxParticipants.trim()) {
        errors.maxParticipants = t('validationRequired');
        return -1;
    }

    const maxParticipants = parseFloat(editor.maxParticipants);
    if (isNaN(maxParticipants) || !Number.isInteger(maxParticipants) || maxParticipants < 1) {
        errors.maxParticipants = t('validationIntegerRequired');
        return -1;
    }

    return Math.round(maxParticipants);
}

/**
 * Validates a required price.
 * @param editor The event editor to validate.
 * @param field The price field to validate.
 * @param errors The object to set errors on.
 * @returns The validated price.
 */
function requirePrice(
    editor: UseEventEditorResponse,
    field: 'fullPrice' | 'currentPrice',
    errors: Record<string, string>,
    t: TranslateFn,
): number {
    if (!editor[field].trim()) {
        errors[field] = t('validationRequired');
        return -1;
    }

    return optionalPrice(editor, field, errors, t);
}

/**
 * Validates an optional price.
 * @param editor The event editor to validate.
 * @param field The price field to validate.
 * @param errors The object to set errors on.
 * @returns The validated price or -1 if not specified.
 */
function optionalPrice(
    editor: UseEventEditorResponse,
    field: 'fullPrice' | 'currentPrice',
    errors: Record<string, string>,
    t: TranslateFn,
): number {
    if (!editor[field].trim()) {
        return -1;
    }

    const price = 100 * parseFloat(editor[field].trim());
    if (isNaN(price)) {
        errors[field] = t('validationNumberRequired');
        return -1;
    }
    if (!Number.isInteger(price)) {
        errors[field] = t('validationDollarAmount');
        return -1;
    }
    if (price < 500) {
        errors[field] = t('validationMinPrice');
        return -1;
    }
    return price;
}

/**
 * Returns the selected cohorts from the event editor.
 * @param editor The event editor to get the cohorts from.
 */
function selectedCohorts(editor: UseEventEditorResponse): string[] {
    return editor.allCohorts ? dojoCohorts : dojoCohorts.filter((c) => editor.cohorts[c]);
}

/**
 * Validates the recurrence rule for the given editor.
 * @param editor The editor to validate.
 * @param timezoneOverride The timezone override of the user creating the recurrence.
 * @param errors The object to set errors on.
 * @returns The final recurrence rule as a string.
 */
function validateRrule(
    editor: UseEventEditorResponse,
    timezoneOverride: string,
    errors: Record<string, string>,
    t: TranslateFn,
): string {
    if (!editor.rruleOptions.freq || !editor.start) {
        return '';
    }

    const options: Partial<Options> = {
        freq: editor.rruleOptions.freq,
        dtstart: getTimeZonedDate(editor.start.toJSDate(), timezoneOverride, 'forward'),
    };

    if (editor.rruleOptions.ends === RRuleEnds.Count) {
        options.count = editor.rruleOptions.count ?? getDefaultRRuleCount(editor.rruleOptions.freq);
        if (options.count <= 0) {
            errors.count = t('validationCountPositive');
        }
    }

    if (editor.rruleOptions.ends === RRuleEnds.Until) {
        if (editor.rruleOptions.until) {
            options.until = new Date(
                getTimeZonedDate(
                    editor.rruleOptions.until.toJSDate(),
                    timezoneOverride,
                ).toISOString(),
            );
        } else {
            options.until = new Date(
                getTimeZonedDate(
                    editor.start.plus({ months: 1 }).toJSDate(),
                    timezoneOverride,
                ).toISOString(),
            );
        }
    }

    return RRule.optionsToString(options);
}

/**
 * Validates class events (IE: lectures and game reviews).
 * @param user The user creating the event.
 * @param originalEvent The original event, if it is being edited.
 * @param editor The editor values.
 * @returns The final event and any errors encountered.
 */
function validateClassEditor(
    user: User,
    originalEvent: ProcessedEvent | undefined,
    editor: UseEventEditorResponse,
    t: TranslateFn,
): [Event | null, Record<string, string>] {
    const errors: Record<string, string> = {};

    validateTimes(editor, errors, t);
    requireField(editor, 'title', errors, t);
    requireField(editor, 'description', errors, t);
    requireField(editor, 'location', errors, t);
    const fullPrice = optionalPrice(editor, 'fullPrice', errors, t);
    const currentPrice = optionalPrice(editor, 'currentPrice', errors, t);
    const rrule = validateRrule(editor, user.timezoneOverride, errors, t);

    if (Object.entries(errors).length > 0) {
        return [null, errors];
    }
    if (!editor.start || !editor.end) {
        return [null, errors];
    }

    return [
        {
            ...((originalEvent?.event as Event) ?? {}),
            type: editor.type,
            owner: user.username,
            ownerDisplayName: user.displayName,
            ownerCohort: user.dojoCohort,
            title: editor.title.trim(),
            startTime: getTimeZonedDate(
                editor.start.toJSDate(),
                user.timezoneOverride,
                'forward',
            ).toISOString(),
            endTime: getTimeZonedDate(
                editor.end.toJSDate(),
                user.timezoneOverride,
                'forward',
            ).toISOString(),
            rrule,
            cohorts: selectedCohorts(editor),
            status: EventStatus.Scheduled,
            location: editor.location.trim(),
            description: editor.description.trim(),
            maxParticipants: 0,
            coaching: {
                stripeId: user.coachInfo?.stripeId ?? '',
                fullPrice,
                currentPrice,
                bookableByFreeUsers: true,
                hideParticipants: false,
            },
            color: editor.color,
            participants: {},
        },
        errors,
    ];
}

/**
 * Validates coaching events.
 * @param user The user creating the event.
 * @param originalEvent The original event, if it is being edited.
 * @param editor The editor values.
 * @returns The final event and any errors encountered.
 */
function validateCoachingEditor(
    user: User,
    originalEvent: ProcessedEvent | undefined,
    editor: UseEventEditorResponse,
    t: TranslateFn,
): [Event | null, Record<string, string>] {
    const errors: Record<string, string> = {};

    validateTimes(editor, errors, t);
    requireField(editor, 'title', errors, t);
    requireField(editor, 'description', errors, t);
    requireField(editor, 'location', errors, t);

    const fullPrice = requirePrice(editor, 'fullPrice', errors, t);
    const currentPrice = optionalPrice(editor, 'currentPrice', errors, t);
    const maxParticipants = requireMaxParticipants(editor, errors, t);
    const rrule = validateRrule(editor, user.timezoneOverride, errors, t);

    if (Object.entries(errors).length > 0) {
        return [null, errors];
    }
    if (!editor.start || !editor.end) {
        return [null, errors];
    }

    return [
        {
            ...((originalEvent?.event as Event) ?? {}),
            type: editor.type,
            owner: user.username,
            ownerDisplayName: user.displayName,
            ownerCohort: user.dojoCohort,
            ownerPreviousCohort: user.previousCohort,
            title: editor.title.trim(),
            startTime: getTimeZonedDate(
                editor.start.toJSDate(),
                user.timezoneOverride,
                'forward',
            ).toISOString(),
            endTime: getTimeZonedDate(
                editor.end.toJSDate(),
                user.timezoneOverride,
                'forward',
            ).toISOString(),
            rrule,
            types: [],
            cohorts: selectedCohorts(editor),
            status: EventStatus.Scheduled,
            location: editor.location.trim(),
            description: editor.description.trim(),
            maxParticipants,
            coaching: {
                stripeId: user.coachInfo?.stripeId || '',
                fullPrice,
                currentPrice,
                bookableByFreeUsers: editor.bookableByFreeUsers,
                hideParticipants: editor.hideParticipants,
            },
            color: editor.color,
            participants: {},
        },
        errors,
    ];
}

/**
 * Validates Dojo events.
 * @param user The user creating the event.
 * @param originalEvent The original event, if it is being edited.
 * @param editor The editor values.
 * @returns The final event and any errors encountered.
 */
function validateDojoEventEditor(
    user: User,
    originalEvent: ProcessedEvent | undefined,
    editor: UseEventEditorResponse,
    t: TranslateFn,
): [Event | null, Record<string, string>] {
    const errors: Record<string, string> = {};

    validateTimes(editor, errors, t);
    requireField(editor, 'title', errors, t);
    const rrule = validateRrule(editor, user.timezoneOverride, errors, t);

    if (Object.entries(errors).length > 0) {
        return [null, errors];
    }
    if (!editor.start || !editor.end) {
        return [null, errors];
    }

    const startTime = getTimeZonedDate(
        editor.start.toJSDate(),
        user.timezoneOverride,
        'forward',
    ).toISOString();
    const endTime = getTimeZonedDate(
        editor.end.toJSDate(),
        user.timezoneOverride,
        'forward',
    ).toISOString();

    return [
        {
            ...((originalEvent?.event as Event) ?? {}),
            type: editor.type,
            owner: user.username,
            ownerDisplayName: user.displayName,
            ownerCohort: user.dojoCohort,
            ownerPreviousCohort: user.previousCohort,
            title: editor.title.trim(),
            startTime,
            endTime,
            rrule,
            types: [],
            cohorts: selectedCohorts(editor),
            status: EventStatus.Scheduled,
            location: editor.location.trim(),
            description: editor.description.trim(),
            maxParticipants: 0,
            color: editor.color,
            participants: {},
        },
        errors,
    ];
}

const { AllTypes, ...AvailabilityTypes } = AvailabilityType;

/**
 * Returns the default max participants for the given availability types.
 * @param allAvailabilityTypes Whether all availability types are enabled.
 * @param availabilityTypes A map from availability type to its enabled status.
 */
function getDefaultMaxParticipants(
    allAvailabilityTypes: boolean,
    availabilityTypes: Record<string, boolean>,
): number {
    if (allAvailabilityTypes) {
        return 100;
    } else {
        let defaultMaxParticipants = 1;
        Object.entries(availabilityTypes).forEach(([type, enabled]) => {
            if (enabled) {
                defaultMaxParticipants = Math.max(
                    defaultMaxParticipants,
                    getDefaultNumberOfParticipants(type as AvailabilityType),
                );
            }
        });
        return defaultMaxParticipants;
    }
}

/**
 * Validates availability events.
 * @param user The user creating the event.
 * @param originalEvent The original event, if it is being edited.
 * @param editor The editor values.
 * @returns The final event and any errors encountered.
 */
function validateAvailabilityEditor(
    user: User,
    originalEvent: ProcessedEvent | undefined,
    editor: UseEventEditorResponse,
    t: TranslateFn,
): [Event | null, Record<string, string>] {
    const errors: Record<string, string> = {};
    const minEnd = getMinEnd(editor.start);

    validateTimes(editor, errors, t, minEnd);

    const selectedTypes: AvailabilityType[] = editor.allAvailabilityTypes
        ? Object.values(AvailabilityTypes)
        : (Object.keys(editor.availabilityTypes).filter(
              (at) => editor.availabilityTypes[at as AvailabilityType],
          ) as AvailabilityType[]);
    if (selectedTypes.length === 0) {
        errors.types = t('validationTypeRequired');
    }
    const cohorts = selectedCohorts(editor);
    if (!editor.inviteOnly && cohorts.length === 0) {
        errors.cohorts = t('validationCohortRequired');
    }
    if (editor.inviteOnly && editor.invited.length === 0) {
        errors.invited = t('validationInviteRequired');
    }

    let maxParticipants = getDefaultMaxParticipants(
        editor.allAvailabilityTypes,
        editor.availabilityTypes,
    );
    if (editor.maxParticipants !== '') {
        maxParticipants = requireMaxParticipants(editor, errors, t);
    }

    if (Object.entries(errors).length > 0) {
        return [null, errors];
    }
    if (!editor.start || !editor.end) {
        return [null, errors];
    }

    const startTime = getTimeZonedDate(
        editor.start.toJSDate(),
        user.timezoneOverride,
        'forward',
    ).toISOString();
    const endTime = getTimeZonedDate(
        editor.end.toJSDate(),
        user.timezoneOverride,
        'forward',
    ).toISOString();

    return [
        {
            ...((originalEvent?.event as Event) ?? {}),
            type: editor.type,
            owner: user.username,
            ownerDisplayName: user.displayName,
            ownerCohort: user.dojoCohort,
            ownerPreviousCohort: user.previousCohort,
            title: editor.title.trim(),
            startTime,
            endTime,
            types: selectedTypes,
            cohorts,
            status: EventStatus.Scheduled,
            location: editor.location.trim(),
            description: editor.description.trim(),
            maxParticipants,
            invited: editor.invited,
            inviteOnly: editor.inviteOnly,
            participants: {},
        },
        errors,
    ];
}

/**
 * Validates the event editor and returns the final event.
 * @param user The user creating/editing the event.
 * @param originalEvent The original event, if it is being edited.
 * @param editor The editor to validate.
 * @returns The final event and any errors encountered.
 */
export function validateEventEditor(
    user: User,
    originalEvent: ProcessedEvent | undefined,
    editor: UseEventEditorResponse,
    t: TranslateFn,
): [Event | null, Record<string, string>] {
    switch (editor.type) {
        case EventType.Availability:
            return validateAvailabilityEditor(user, originalEvent, editor, t);
        case EventType.Dojo:
            return validateDojoEventEditor(user, originalEvent, editor, t);
        case EventType.Coaching:
            return validateCoachingEditor(user, originalEvent, editor, t);
        case EventType.LectureTier:
        case EventType.GameReviewTier:
            return validateClassEditor(user, originalEvent, editor, t);
    }
}
