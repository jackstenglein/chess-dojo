import { Event, EventType } from '@jackstenglein/chess-dojo-common/src/database/event';

export { EventType };
export type { Event };

export enum CalendarSessionType {
    AllSessions = 'ALL_SESSIONS',
    Availabilities = 'AVAILABILITIES',
    Meetings = 'MEETINGS',
    DojoEvents = 'DOJO_EVENTS',
    CoachingSessions = 'COACHING_SESSIONS',
    Lectures = 'LECTURE_TIER',
    GameReviews = 'GAME_REVIEW_TIER',
}

export enum TournamentType {
    AllTournamentTypes = 'ALL_TOURNAMENT_TYPES',
    Swiss = 'SWISS',
    Arena = 'ARENA',
}

export enum TimeControlType {
    AllTimeContols = 'ALL_TIME_CONTROLS',
    Blitz = 'BLITZ',
    Rapid = 'RAPID',
    Classical = 'CLASSICAL',
}

export enum PositionType {
    AllPositions = 'ALL_POSITION_TYPES',
    Standard = 'STANDARD',
    Custom = 'CUSTOM',
}

export interface LigaTournament {
    // The type of the tournament (IE: Swiss or Arena)
    type: TournamentType;

    // The Lichess id of the tournament
    id: string;

    // Whether the tournament is rated or not
    rated: boolean;

    // The time control type of the tournament (blitz, rapid, classical)
    timeControlType: TimeControlType;

    // The initial time limit in seconds
    limitSeconds: number;

    // The time increment in seconds
    incrementSeconds: number;

    // The FEN of the starting position, if the tournament uses a custom position
    fen?: string;

    // The Lichess URL of the tournament
    url: string;

    // The number of rounds in the tournament. Only present for Swiss tournaments.
    numRounds?: number;

    // The current round this LigaTournament object refers to. Only present for Swiss tournaments.
    currentRound?: number;
}

export interface Coaching {
    /** The coach's Stripe id. */
    stripeId: string;

    /** The normal full price of the coaching session, in cents. */
    fullPrice: number;

    /**
     * The current price of the coaching session, in cents. If non-positive,
     * fullPrice is used instead.
     */
    currentPrice: number;

    /** Whether the coaching session is bookable by free users. */
    bookableByFreeUsers: boolean;

    /** Whether to hide the participant list until the session is booked. */
    hideParticipants: boolean;
}

export interface Participant {
    username: string;
    displayName: string;
    cohort: string;
    previousCohort: string;

    /** Whether the user has successfully paid. Only relevant for EventType.Coaching. */
    hasPaid?: boolean;
}

export enum EventStatus {
    Scheduled = 'SCHEDULED',
    Booked = 'BOOKED',
    Canceled = 'CANCELED',
}

export enum AvailabilityType {
    AllTypes = 'ALL_TYPES',
    ClassicalGame = 'CLASSICAL_GAME',
    OpeningSparring = 'OPENING_SPARRING',
    MiddlegameSparring = 'MIDDLEGAME_SPARRING',
    EndgameSparring = 'ENDGAME_SPARRING',
    RookEndgameProgression = 'ROOK_ENDGAME_PROGRESSION',
    ClassicAnalysis = 'CLASSIC_ANALYSIS',
    AnalyzeOwnGame = 'ANALYZE_OWN_GAME',
    BookStudy = 'BOOK_STUDY',
    Lesson = 'LESSON',
}

export function getDisplaySessionString(type: CalendarSessionType | null | undefined): string {
    if (!type) {
        return '';
    }

    switch (type) {
        case CalendarSessionType.AllSessions:
            return 'All Events';
        case CalendarSessionType.Availabilities:
            return 'Availabilities';
        case CalendarSessionType.CoachingSessions:
            return 'Coaching Sessions';
        case CalendarSessionType.DojoEvents:
            return 'Dojo Events';
        case CalendarSessionType.Meetings:
            return 'Meetings';
        case CalendarSessionType.Lectures:
            return 'Workshops';
        case CalendarSessionType.GameReviews:
            return 'Game & Profile Reviews';
    }
}

export function getDisplayString(type: AvailabilityType | null | undefined): string {
    if (!type) {
        return '';
    }

    switch (type) {
        case AvailabilityType.AllTypes:
            return 'All Types';
        case AvailabilityType.ClassicalGame:
            return 'Classical Game';
        case AvailabilityType.OpeningSparring:
            return 'Opening Sparring';
        case AvailabilityType.MiddlegameSparring:
            return 'Middlegame Sparring';
        case AvailabilityType.EndgameSparring:
            return 'Endgame Sparring';
        case AvailabilityType.RookEndgameProgression:
            return 'Rook Endgame Progression';
        case AvailabilityType.ClassicAnalysis:
            return 'Analyze Classic Game';
        case AvailabilityType.AnalyzeOwnGame:
            return 'Analyze Own Game';
        case AvailabilityType.BookStudy:
            return 'Book Study';
        case AvailabilityType.Lesson:
            return 'Lesson/Workshop';
    }
}

export function getDefaultNumberOfParticipants(type: AvailabilityType): number {
    switch (type) {
        case AvailabilityType.ClassicalGame:
        case AvailabilityType.OpeningSparring:
        case AvailabilityType.MiddlegameSparring:
        case AvailabilityType.EndgameSparring:
        case AvailabilityType.RookEndgameProgression:
            return 1;

        case AvailabilityType.AllTypes:
        case AvailabilityType.ClassicAnalysis:
        case AvailabilityType.AnalyzeOwnGame:
        case AvailabilityType.BookStudy:
        case AvailabilityType.Lesson:
            return 100;
    }
}

export function displayTournamentType(type: TournamentType | null | undefined): string {
    if (!type) return '';

    switch (type) {
        case TournamentType.AllTournamentTypes:
            return 'All Tournament Types';
        case TournamentType.Arena:
            return 'Arena';
        case TournamentType.Swiss:
            return 'Swiss';
    }
}

export function displayTimeControlType(
    type: TimeControlType | null | undefined,
): '' | 'Blitz' | 'Classical' | 'Rapid' | 'All Time Controls' {
    if (!type) return '';

    switch (type) {
        case TimeControlType.Blitz:
            return 'Blitz';
        case TimeControlType.Classical:
            return 'Classical';
        case TimeControlType.Rapid:
            return 'Rapid';
        case TimeControlType.AllTimeContols:
            return 'All Time Controls';
    }
}

export function displayPositionType(type: PositionType | null | undefined): string {
    if (!type) return '';

    switch (type) {
        case PositionType.AllPositions:
            return 'All Position Types';
        case PositionType.Standard:
            return 'Standard';
        case PositionType.Custom:
            return 'Custom';
    }
}
