import { useAuth } from '@/auth/Auth';
import { AvailabilityType, Event, EventType, Participant } from '@/database/event';
import { dojoCohorts } from '@/database/user';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useState } from 'react';
import { Frequency, Options, RRule, RRuleSet, rrulestr } from 'rrule';

/**
 * Returns true if the provided object is a valid date.
 * @param d The object to check.
 * @returns True if the object is a valid date.
 */
export function isValidDate(d: unknown) {
    return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Returns a Date one hour after the provided start date.
 * @param start The start date to get the minimum end from.
 * @returns A Date one hour after the provided start date, or null if start was null.
 */
export function getMinEnd(start: DateTime | null): DateTime | null {
    let minEnd: DateTime | null = null;
    if (start !== null) {
        minEnd = start.plus({ hours: 1 });
    }
    return minEnd;
}

export type EditableEventType =
    | EventType.Availability
    | EventType.Coaching
    | EventType.Dojo
    | EventType.LectureTier
    | EventType.GameReviewTier;

function getInitialRRuleOptions(rrule: string | undefined): Partial<Options> {
    if (!rrule) {
        return {};
    }

    try {
        const parsed = rrulestr(rrule, { forceset: true });
        if (parsed instanceof RRuleSet) {
            return parsed.rrules()[0]?.origOptions ?? {};
        }
        return parsed.origOptions;
    } catch {
        return RRule.parseString(rrule);
    }
}

export interface UseEventEditorResponse {
    /** The type of the Event. */
    type: EditableEventType;

    /**
     * Sets the type of the Event.
     * @param type The new type of the Event.
     */
    setType: (type: EditableEventType) => void;

    /** The title of the Event. */
    title: string;

    /**
     * Sets the title of the Event.
     * @param title The new title of the Event.
     */
    setTitle: (title: string) => void;

    /** The start Date of the Event. */
    start: DateTime | null;

    /**
     * Sets the start date of the Event.
     * @param date The new start date of the Event.
     */
    setStart: (date: DateTime | null) => void;

    /** The end date of the Event. */
    end: DateTime | null;

    /**
     * Sets the end date of the Event.
     * @param date The new end date of the Event.
     * @returns
     */
    setEnd: (date: DateTime | null) => void;

    /** The location of the Event. */
    location: string;

    /**
     * Sets the location of the Event.
     * @param location The new location of the Event.
     */
    setLocation: (location: string) => void;

    /** The description of the Event. */
    description: string;

    /**
     * Sets the description of the Event.
     * @param description The new description of the Event.
     */
    setDescription: (description: string) => void;

    /** The maximum number of participants on the Event. */
    maxParticipants: string;

    /**
     * Sets the max participants on the Event.
     * @param maxParticipants The new max participants on the Event.
     */
    setMaxParticipants: (maxParticipants: string) => void;

    /** Whether all availability types are enabled. */
    allAvailabilityTypes: boolean;

    /**
     * Sets whether all availability types are enabled.
     * @param enabled The new value of whether all availability types are enabled.
     */
    setAllAvailabilityTypes: (enabled: boolean) => void;

    /** A map from availability type to whether it is enabled for the Event. */
    availabilityTypes: Record<AvailabilityType, boolean>;

    /**
     * Sets whether the given availability type is enabled.
     * @param type The availability type to update.
     * @param value The new value of the availability type.
     */
    setAvailabilityType: (type: AvailabilityType, value: boolean) => void;

    /** Whether all cohorts can book this Event. */
    allCohorts: boolean;

    /**
     * Sets whether all cohorts can book this Event.
     * @param value The new value of whether all cohorts can book this Event.
     */
    setAllCohorts: (value: boolean) => void;

    /** A map from cohort to whether it can book the Event. */
    cohorts: Record<string, boolean>;

    /**
     * Sets whether the given cohort can book the Event.
     * @param cohort The cohort to update.
     * @param value The new value of whether the cohort can book the Event.
     */
    setCohort: (cohort: string, value: boolean) => void;

    /** The full price of booking the Event. */
    fullPrice: string;

    /**
     * Sets the full price of the Event.
     * @param fullPrice The new full price of the Event.
     */
    setFullPrice: (fullPrice: string) => void;

    /** The current price of booking the Event. */
    currentPrice: string;

    /**
     * Sets the current price of the Event.
     * @param currentPrice The new current price of the Event.
     */
    setCurrentPrice: (currentPrice: string) => void;

    /** Whether the Event is bookable by free users. */
    bookableByFreeUsers: boolean;

    /**
     * Sets whether the Event is bookable by free users.
     * @param value Whether the Event is bookable by free users.
     */
    setBookableByFreeUsers: (value: boolean) => void;

    /** Whether to hide the participant list until the session is booked. */
    hideParticipants: boolean;

    /**
     * Sets whether to hide the participant list until the session is booked.
     * @param value Whether to hide the participant list.
     */
    setHideParticipants: (value: boolean) => void;

    /** Whether the Event is hidden from the public Discord server. */
    hideFromPublicDiscord: boolean;

    /**
     * Sets whether the Event is hidden from the public Discord server.
     * @param value Whether the Event is hidden from the public Discord server.
     */
    setHideFromPublicDiscord: (value: boolean) => void;

    /** The recurrence rule options of the event. */
    rruleOptions: RRuleOptions;

    /**
     * Sets the recurrence rule options.
     */
    setRRuleOptions: (value: RRuleOptions) => void;

    /** A list of users invited to the event. */
    invited: Participant[];

    /** Sets the list of users invited to the event. */
    setInvited: (v: Participant[]) => void;

    /** Whether the event can only be booked by people invited. */
    inviteOnly: boolean;

    /** Sets whether the event can only be booked by people invited. */
    setInviteOnly: (value: boolean) => void;

    /** The color of the event. */
    color: string;

    /** Sets the color of the event. */
    setColor: (value: string) => void;

    /** A map of errors in the form. */
    errors: Record<string, string>;

    /**
     * Sets the errors in the form.
     * @param errors The new errors value.
     */
    setErrors: (errors: Record<string, string>) => void;
}

export enum RRuleEnds {
    Never = 'NEVER',
    Until = 'UNTIL',
    Count = 'COUNT',
}

export interface RRuleOptions {
    /** If undefined, the event does not recur. */
    freq?: Frequency;
    /** The type of criteria used to end the event. */
    ends: RRuleEnds;
    /** The date that is a limit of the event. */
    until: DateTime | null;
    /** The number of occurrences generated before the event ends. */
    count?: number;
}

/**
 * Gets the default number of occurrences for an RRule based on its frequency.
 * @param freq The frequency of the RRule.
 * @returns The default number of occurrences.
 */
export function getDefaultRRuleCount(freq: Frequency): number {
    switch (freq) {
        case Frequency.MONTHLY:
            return 12;
        case Frequency.WEEKLY:
            return 4;
        case Frequency.DAILY:
            return 30;
        default:
            return 2;
    }
}

/**
 * Returns the fields and setters for an Event editor.
 * @param initialStart The initial start date of the Event.
 * @param initialEnd The initial end date of the Event.
 * @param initialEvent The initial Event.
 * @returns The fields and setters for an Event editor.
 */
export default function useEventEditor(
    initialStart: Date,
    initialEnd: Date,
    initialEvent?: Event,
): UseEventEditorResponse {
    const { user } = useAuth();

    const [type, setType] = useState<EditableEventType>(
        (initialEvent?.type as EditableEventType) ?? EventType.Availability,
    );
    const [title, setTitle] = useState<string>(initialEvent?.title || '');

    const [start, setStart] = useState<DateTime | null>(
        initialStart ? DateTime.fromJSDate(initialStart) : null,
    );
    const [end, setEnd] = useState<DateTime | null>(
        initialEnd ? DateTime.fromJSDate(initialEnd) : null,
    );

    const [location, setLocation] = useState(initialEvent?.location || '');
    const [description, setDescription] = useState(initialEvent?.description || '');
    const [maxParticipants, setMaxParticipants] = useState(
        `${initialEvent?.maxParticipants || ''}`,
    );

    const [allAvailabilityTypes, setAllAvailabilityTypes] = useState(false);
    const [availabilityTypes, setAvailabilityTypes] = useState<Record<AvailabilityType, boolean>>(
        Object.values(AvailabilityType).reduce<Record<string, boolean>>((map, type) => {
            map[type] = false;
            return map;
        }, {}),
    );
    const setAvailabilityType = useCallback(
        (type: AvailabilityType, value: boolean) => {
            setAvailabilityTypes((types) => ({
                ...types,
                [type]: value,
            }));
        },
        [setAvailabilityTypes],
    );

    const userCohortIndex = dojoCohorts.findIndex((c) => c === user?.dojoCohort);
    const [allCohorts, setAllCohorts] = useState(false);
    const [cohorts, setCohorts] = useState<Record<string, boolean>>(
        dojoCohorts.reduce<Record<string, boolean>>((map, cohort, index) => {
            map[cohort] = userCohortIndex >= 0 && Math.abs(index - userCohortIndex) <= 1;
            return map;
        }, {}),
    );
    const setCohort = useCallback(
        (cohort: string, value: boolean) => {
            setCohorts((cohorts) => ({
                ...cohorts,
                [cohort]: value,
            }));
        },
        [setCohorts],
    );

    const [fullPrice, setFullPrice] = useState(
        (initialEvent?.coaching?.fullPrice ?? 0) > 0
            ? `${initialEvent?.coaching?.fullPrice ?? 0 / 100}`
            : '',
    );
    const [currentPrice, setCurrentPrice] = useState(
        (initialEvent?.coaching?.currentPrice ?? 0) > 0
            ? `${initialEvent?.coaching?.currentPrice ?? 0 / 100}`
            : '',
    );
    const [bookableByFreeUsers, setBookableByFreeUsers] = useState(
        initialEvent?.coaching?.bookableByFreeUsers || false,
    );
    const [hideParticipants, setHideParticipants] = useState(
        initialEvent?.coaching?.hideParticipants || false,
    );

    const [hideFromPublicDiscord, setHideFromPublicDiscord] = useState(
        initialEvent?.hideFromPublicDiscord || false,
    );

    const options = getInitialRRuleOptions(initialEvent?.rrule);
    const [rruleOptions, setRRuleOptions] = useState<RRuleOptions>({
        freq: options.freq,
        ends: options.count ? RRuleEnds.Count : options.until ? RRuleEnds.Until : RRuleEnds.Never,
        until: options.until ? DateTime.fromJSDate(options.until) : null,
        count: options.count || undefined,
    });

    const [invited, setInvited] = useState<Participant[]>(initialEvent?.invited ?? []);
    const [inviteOnly, setInviteOnly] = useState(initialEvent?.inviteOnly || false);

    const [color, setColor] = useState(initialEvent?.color ?? '');

    const [errors, setErrors] = useState<Record<string, string>>({});

    const onChangeEventType = useCallback(
        (value: EditableEventType) => {
            const allFalseCohorts = dojoCohorts.reduce<Record<string, boolean>>((map, cohort) => {
                map[cohort] = false;
                return map;
            }, {});

            setType(value);

            if (value === EventType.Availability) {
                const originalCohorts: string[] = initialEvent?.cohorts || [];
                setAllCohorts(false);
                if (originalCohorts) {
                    setCohorts(() =>
                        originalCohorts.reduce(
                            (map, cohort) => {
                                map[cohort] = true;
                                return map;
                            },
                            Object.assign({}, allFalseCohorts),
                        ),
                    );
                } else {
                    setCohorts(
                        dojoCohorts.reduce<Record<string, boolean>>((map, cohort, index) => {
                            map[cohort] =
                                userCohortIndex >= 0 && Math.abs(index - userCohortIndex) <= 1;
                            return map;
                        }, {}),
                    );
                }
            } else {
                setAllCohorts(true);
                setCohorts(allFalseCohorts);
            }
        },
        [setType, setAllCohorts, setCohorts, initialEvent, userCohortIndex],
    );

    useEffect(() => {
        const originalTypes: AvailabilityType[] = initialEvent?.types || [];
        if (originalTypes.length > 0) {
            setAvailabilityTypes((t) =>
                originalTypes.reduce(
                    (map, type) => {
                        map[type] = true;
                        return map;
                    },
                    Object.assign({}, t),
                ),
            );
        }

        const originalCohorts: string[] = initialEvent?.cohorts || [];
        if (originalCohorts.length === dojoCohorts.length) {
            setAllCohorts(true);
        } else if (originalCohorts.length > 0) {
            const allFalseCohorts = dojoCohorts.reduce<Record<string, boolean>>((map, cohort) => {
                map[cohort] = false;
                return map;
            }, {});
            setCohorts(() =>
                originalCohorts.reduce(
                    (map, cohort) => {
                        map[cohort] = true;
                        return map;
                    },
                    Object.assign({}, allFalseCohorts),
                ),
            );
        }
    }, [initialEvent, setAvailabilityTypes, setCohorts]);

    return {
        type,
        setType: onChangeEventType,

        title,
        setTitle,

        start,
        setStart,

        end,
        setEnd,

        location,
        setLocation,

        description,
        setDescription,

        maxParticipants,
        setMaxParticipants,

        allAvailabilityTypes,
        setAllAvailabilityTypes,
        availabilityTypes,
        setAvailabilityType,

        allCohorts,
        setAllCohorts,
        cohorts,
        setCohort,

        fullPrice,
        setFullPrice,
        currentPrice,
        setCurrentPrice,
        bookableByFreeUsers,
        setBookableByFreeUsers,
        hideParticipants,
        setHideParticipants,

        hideFromPublicDiscord,
        setHideFromPublicDiscord,

        rruleOptions,
        setRRuleOptions,

        invited,
        setInvited,
        inviteOnly,
        setInviteOnly,

        color,
        setColor,

        errors,
        setErrors,
    };
}
