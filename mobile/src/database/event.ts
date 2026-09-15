export enum EventType {
    Availability = 'AVAILABILITY',
    Dojo = 'DOJO',
    LigaTournament = 'LIGA_TOURNAMENT',
}

export interface Event {
    id: string;
    type: EventType;
    owner: string;
    ownerDisplayName: string;
    ownerCohort: string;
    ownerPreviousCohort: string;
    title: string;
    /** @deprecated Prefer rrule DTSTART when present. */
    startTime?: string;
    /** @deprecated Prefer durationMs when present. */
    endTime?: string;
    /** Duration of each occurrence in milliseconds. */
    durationMs?: number;
    bookedStartTime: string;
    types: AvailabilityType[];
    bookedType: AvailabilityType;
    cohorts: string[];
    status: AvailabilityStatus;
    location: string;
    description: string;
    maxParticipants: number;
    participants?: Participant[];
    discordMessageId: string;
    privateDiscordEventId: string;
    publicDiscordEventId: string;

    // The LigaTournament information for this event. Only present for LigaTournaments.
    ligaTournament?: LigaTournament;
}

export enum TournamentType {
    Swiss = 'SWISS',
    Arena = 'ARENA',
}

export enum TimeControlType {
    Blitz = 'BLITZ',
    Rapid = 'RAPID',
    Classical = 'CLASSICAL',
}

export enum PositionType {
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

export interface Participant {
    username: string;
    displayName: string;
    cohort: string;
    previousCohort: string;
}

export enum AvailabilityStatus {
    Scheduled = 'SCHEDULED',
    Booked = 'BOOKED',
    Canceled = 'CANCELED',
}

export enum AvailabilityType {
    ClassicalGame = 'CLASSICAL_GAME',
    OpeningSparring = 'OPENING_SPARRING',
    MiddlegameSparring = 'MIDDLEGAME_SPARRING',
    EndgameSparring = 'ENDGAME_SPARRING',
    RookEndgameProgression = 'ROOK_ENDGAME_PROGRESSION',
    ClassicAnalysis = 'CLASSIC_ANALYSIS',
    AnalyzeOwnGame = 'ANALYZE_OWN_GAME',
    BookStudy = 'BOOK_STUDY',
}

export function getDisplayString(type: AvailabilityType | null | undefined): string {
    if (!type) {
        return '';
    }

    switch (type) {
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
    }
}

export function getDefaultNumberOfParticipants(type: AvailabilityType): number {
    switch (type) {
        case AvailabilityType.ClassicalGame:
            return 1;
        case AvailabilityType.OpeningSparring:
            return 1;
        case AvailabilityType.MiddlegameSparring:
            return 1;
        case AvailabilityType.EndgameSparring:
            return 1;
        case AvailabilityType.RookEndgameProgression:
            return 1;
        case AvailabilityType.ClassicAnalysis:
            return 100;
        case AvailabilityType.AnalyzeOwnGame:
            return 100;
        case AvailabilityType.BookStudy:
            return 100;
    }
}

export function displayTournamentType(type: TournamentType | null | undefined): string {
    if (!type) return '';

    switch (type) {
        case TournamentType.Arena:
            return 'Arena';
        case TournamentType.Swiss:
            return 'Swiss';
    }
}

export function displayTimeControlType(type: TimeControlType | null | undefined): string {
    if (!type) return '';

    switch (type) {
        case TimeControlType.Blitz:
            return 'Blitz';
        case TimeControlType.Classical:
            return 'Classical';
        case TimeControlType.Rapid:
            return 'Rapid';
    }
}
