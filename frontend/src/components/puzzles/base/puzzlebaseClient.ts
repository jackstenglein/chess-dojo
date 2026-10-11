import {
    addContributor,
    applyToContribute,
    approveContributor,
    createPuzzle,
    createTheme,
    deleteTheme,
    denyContributor,
    getContributorProfile,
    getContributorStatus,
    getLeaderboard,
    getPuzzle,
    getPuzzleRuns,
    getPuzzleStats,
    getTaxonomy,
    getTrainingPuzzles,
    getTrainingTags,
    importLichessStudy,
    listAdminLog,
    listContributors,
    listPuzzles,
    listSuggestions,
    resolveSuggestions,
    revokeContributor,
    submitAttempt,
    suggestTags,
    updatePuzzle,
    voteOnPuzzle,
} from '@/api/puzzlebaseApi';
import {
    AdminAction,
    ContributorProfileResponse,
    ContributorStatusResponse,
    CreatePuzzleRequest,
    CreatePuzzleResponse,
    CreateThemeRequest,
    DeleteThemeRequest,
    DeleteThemeResponse,
    ImportLichessStudyRequest,
    ImportLichessStudyResponse,
    LeaderboardEntry,
    PuzzlebaseContributor,
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
    UpdatePuzzleRequest,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    AttemptSubmission,
    PuzzleAttempt,
    PuzzleRunsResponse,
    PuzzleStatsResponse,
    TrainingTagSet,
    TrainQuery,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import {
    ResolveSuggestionsRequest,
    SuggestionSummary,
    SuggestTagsRequest,
    SuggestTagsResponse,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/suggestions';
import { Vote, VoteResponse } from '@jackstenglein/chess-dojo-common/src/puzzlebase/votes';
import { searchMembersByName } from './memberSearch';

/** A Dojo member found by searching. */
export interface MemberMatch {
    username: string;
    displayName: string;
    dojoCohort?: string;
}

/**
 * Everything the puzzlebase screens ask of the server. Screens depend on this rather than on the
 * API functions directly, so they can be tested and previewed without a backend.
 */
export interface PuzzlebaseClient {
    getStatus(): Promise<ContributorStatusResponse>;
    apply(): Promise<PuzzlebaseContributor>;
    listContributors(): Promise<PuzzlebaseContributor[]>;
    /** Whether a user is a Puzzle Contributor. Public: works for anyone. */
    getProfile(username: string): Promise<ContributorProfileResponse>;
    approve(username: string): Promise<PuzzlebaseContributor>;
    /** Makes a user a Puzzle Contributor without an application. Admins only. */
    addContributor(username: string): Promise<PuzzlebaseContributor>;
    /** Finds Dojo members by name, to pick someone to add as a contributor. */
    searchMembers(query: string): Promise<MemberMatch[]>;
    /** Turns down a pending application. Admins only. */
    deny(username: string): Promise<PuzzlebaseContributor>;
    /** Takes away an approved contributor's access; their puzzles stay. Admins only. */
    revoke(username: string): Promise<PuzzlebaseContributor>;

    listPuzzles(): Promise<PuzzlebasePuzzle[]>;
    getPuzzle(id: string): Promise<PuzzlebasePuzzle>;
    createPuzzle(request: CreatePuzzleRequest): Promise<CreatePuzzleResponse>;
    importStudy(request: ImportLichessStudyRequest): Promise<ImportLichessStudyResponse>;
    updatePuzzle(request: UpdatePuzzleRequest): Promise<PuzzlebasePuzzle>;

    getTaxonomy(): Promise<PuzzlebaseTaxonomy>;
    createTheme(request: CreateThemeRequest): Promise<PuzzlebaseTaxonomy>;
    /** Deletes a theme from a bucket, and from puzzles if no bucket lists it any more. Admins only. */
    deleteTheme(request: DeleteThemeRequest): Promise<DeleteThemeResponse>;
    /** What puzzle admins have done, newest first. Admins only. */
    listAdminLog(): Promise<AdminAction[]>;
    getLeaderboard(): Promise<LeaderboardEntry[]>;

    /**
     * Suggests changes to a puzzle's tags; any signed-in member can. They wait in a review pile,
     * unless the member is a Puzzle Contributor: then they are made at once, and the updated
     * puzzle comes back.
     */
    suggestTags(puzzleId: string, request: SuggestTagsRequest): Promise<SuggestTagsResponse>;
    /** The review pile: puzzles with suggested tags. For Puzzle Contributors. */
    listSuggestions(): Promise<SuggestionSummary[]>;
    /** Accepts or dismisses a puzzle's suggested tags, by name. Returns the puzzle. */
    resolveSuggestions(
        puzzleId: string,
        request: ResolveSuggestionsRequest,
    ): Promise<PuzzlebasePuzzle>;

    /** Gives a puzzle a thumbs up (1) or down (-1), or takes the vote back (0). After playing it. */
    vote(puzzleId: string, vote: Vote): Promise<VoteResponse>;

    /** The tags the puzzles have, so only choices that find puzzles are offered when training. */
    trainingTags(): Promise<TrainingTagSet[]>;
    /** Puzzles to train on. Any signed-in member can train. */
    train(query: TrainQuery): Promise<PuzzlebasePuzzle[]>;
    /** Records an attempt at a puzzle: every move tried, wrong ones too, and the time for each. */
    submitAttempt(submission: AttemptSubmission): Promise<PuzzleAttempt>;
    /** Someone's running totals. Members see their own; coaches and admins see anyone's. */
    getPuzzleStats(username: string): Promise<PuzzleStatsResponse>;
    /** Someone's sessions and attempts, by default the last 30 days. */
    getPuzzleRuns(
        username: string,
        range?: { from?: string; to?: string },
    ): Promise<PuzzleRunsResponse>;
}

/** The client that talks to the real puzzlebase API. */
export const apiPuzzlebaseClient: PuzzlebaseClient = {
    getStatus: async () => (await getContributorStatus()).data,
    apply: async () => (await applyToContribute()).data,
    listContributors: async () => (await listContributors()).data,
    getProfile: async (username) => (await getContributorProfile(username)).data,
    approve: async (username) => (await approveContributor(username)).data,
    addContributor: async (username) => (await addContributor(username)).data,
    searchMembers: searchMembersByName,
    deny: async (username) => (await denyContributor(username)).data,
    revoke: async (username) => (await revokeContributor(username)).data,

    listPuzzles: async () => (await listPuzzles()).data,
    getPuzzle: async (id) => (await getPuzzle(id)).data,
    createPuzzle: async (request) => (await createPuzzle(request)).data,
    importStudy: async (request) => (await importLichessStudy(request)).data,
    updatePuzzle: async (request) => (await updatePuzzle(request)).data,

    getTaxonomy: async () => (await getTaxonomy()).data,
    createTheme: async (request) => (await createTheme(request)).data,
    deleteTheme: async (request) => (await deleteTheme(request)).data,
    listAdminLog: async () => (await listAdminLog()).data,
    getLeaderboard: async () => (await getLeaderboard()).data,

    suggestTags: async (puzzleId, request) => (await suggestTags(puzzleId, request)).data,
    listSuggestions: async () => (await listSuggestions()).data,
    resolveSuggestions: async (puzzleId, request) =>
        (await resolveSuggestions(puzzleId, request)).data,

    vote: async (puzzleId, vote) => (await voteOnPuzzle({ puzzleId, vote })).data,
    trainingTags: async () => (await getTrainingTags()).data,
    train: async (query) => (await getTrainingPuzzles(query)).data,
    submitAttempt: async (submission) => (await submitAttempt(submission)).data,
    getPuzzleStats: async (username) => (await getPuzzleStats(username)).data,
    getPuzzleRuns: async (username, range) => (await getPuzzleRuns(username, range)).data,
};

/** Returns the client the screens should use: the one that talks to the real puzzlebase API. */
export function getPuzzlebaseClient(): PuzzlebaseClient {
    return apiPuzzlebaseClient;
}
