import {
    AdminAction,
    ApplyToContributeRequest,
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
import { VoteRequest, VoteResponse } from '@jackstenglein/chess-dojo-common/src/puzzlebase/votes';
import { AxiosResponse } from 'axios';
import { axiosService } from './axiosService';

/**
 * Whether the caller is a Puzzle Contributor, whether they are an admin, and their application.
 */
export function getContributorStatus(): Promise<AxiosResponse<ContributorStatusResponse>> {
    return axiosService.get<ContributorStatusResponse>('/puzzlebase/contributors/me', {
        functionName: 'getContributorStatus',
    });
}

/** Applies to become a Puzzle Contributor. Applying again returns the existing application. */
export function applyToContribute(
    request: ApplyToContributeRequest = {},
): Promise<AxiosResponse<PuzzlebaseContributor>> {
    return axiosService.post<PuzzlebaseContributor>('/puzzlebase/contributors/apply', request, {
        functionName: 'applyToContribute',
    });
}

/** Lists every Puzzle Contributor and application. The caller must be an admin. */
export function listContributors(): Promise<AxiosResponse<PuzzlebaseContributor[]>> {
    return axiosService.get<PuzzlebaseContributor[]>('/puzzlebase/contributors', {
        functionName: 'listContributors',
    });
}

/** Approves an application. The caller must be an admin. */
export function approveContributor(
    username: string,
): Promise<AxiosResponse<PuzzlebaseContributor>> {
    return axiosService.post<PuzzlebaseContributor>(
        `/puzzlebase/contributors/${username}/approve`,
        {},
        { functionName: 'approveContributor' },
    );
}

/** Denies an application. The caller must be an admin. */
export function denyContributor(username: string): Promise<AxiosResponse<PuzzlebaseContributor>> {
    return axiosService.post<PuzzlebaseContributor>(
        `/puzzlebase/contributors/${username}/deny`,
        {},
        { functionName: 'denyContributor' },
    );
}

/** Makes a user a Puzzle Contributor without an application. The caller must be an admin. */
export function addContributor(username: string): Promise<AxiosResponse<PuzzlebaseContributor>> {
    return axiosService.post<PuzzlebaseContributor>(
        `/puzzlebase/contributors/${username}/add`,
        {},
        { functionName: 'addContributor' },
    );
}

/** Takes away a contributor's access. The caller must be an admin. */
export function revokeContributor(username: string): Promise<AxiosResponse<PuzzlebaseContributor>> {
    return axiosService.post<PuzzlebaseContributor>(
        `/puzzlebase/contributors/${username}/revoke`,
        {},
        { functionName: 'revokeContributor' },
    );
}

/**
 * Whether a user is a Puzzle Contributor, for the badge on their profile. Public: needs no
 * sign-in.
 */
export function getContributorProfile(
    username: string,
): Promise<AxiosResponse<ContributorProfileResponse>> {
    return axiosService.get<ContributorProfileResponse>(
        `/public/puzzlebase/contributors/${username}`,
        { functionName: 'getContributorProfile' },
    );
}

/** Lists every puzzle. The caller must be a Puzzle Contributor or an admin. */
export function listPuzzles(): Promise<AxiosResponse<PuzzlebasePuzzle[]>> {
    return axiosService.get<PuzzlebasePuzzle[]>('/puzzlebase/puzzles', {
        functionName: 'listPuzzles',
    });
}

/** Fetches one puzzle. The caller must be a Puzzle Contributor or an admin. */
export function getPuzzle(id: string): Promise<AxiosResponse<PuzzlebasePuzzle>> {
    return axiosService.get<PuzzlebasePuzzle>(`/puzzlebase/puzzles/${id}`, {
        functionName: 'getPuzzle',
    });
}

/** Adds a puzzle from a PGN. The caller must be a Puzzle Contributor or an admin. */
export function createPuzzle(
    request: CreatePuzzleRequest,
): Promise<AxiosResponse<CreatePuzzleResponse>> {
    return axiosService.post<CreatePuzzleResponse>('/puzzlebase/puzzles', request, {
        functionName: 'createPuzzle',
    });
}

/** Imports every chapter of a Lichess study as a puzzle. */
export function importLichessStudy(
    request: ImportLichessStudyRequest,
): Promise<AxiosResponse<ImportLichessStudyResponse>> {
    return axiosService.post<ImportLichessStudyResponse>('/puzzlebase/import', request, {
        functionName: 'importLichessStudy',
    });
}

/** Changes a puzzle's rating, tags, details, or its position and solution. */
export function updatePuzzle({
    id,
    ...request
}: UpdatePuzzleRequest): Promise<AxiosResponse<PuzzlebasePuzzle>> {
    return axiosService.put<PuzzlebasePuzzle>(`/puzzlebase/puzzles/${id}`, request, {
        functionName: 'updatePuzzle',
    });
}

/** Fetches the buckets and their themes. */
export function getTaxonomy(): Promise<AxiosResponse<PuzzlebaseTaxonomy>> {
    return axiosService.get<PuzzlebaseTaxonomy>('/puzzlebase/taxonomy', {
        functionName: 'getTaxonomy',
    });
}

/** Adds a theme to a bucket. Returns the updated taxonomy. */
export function createTheme(
    request: CreateThemeRequest,
): Promise<AxiosResponse<PuzzlebaseTaxonomy>> {
    return axiosService.post<PuzzlebaseTaxonomy>('/puzzlebase/taxonomy/themes', request, {
        functionName: 'createTheme',
    });
}

/** Deletes a theme from a bucket. For puzzle admins. */
export function deleteTheme(
    request: DeleteThemeRequest,
): Promise<AxiosResponse<DeleteThemeResponse>> {
    return axiosService.post<DeleteThemeResponse>('/puzzlebase/taxonomy/themes/delete', request, {
        functionName: 'deleteTheme',
    });
}

/** Fetches the admin log, newest first. For puzzle admins. */
export function listAdminLog(): Promise<AxiosResponse<AdminAction[]>> {
    return axiosService.get<AdminAction[]>('/puzzlebase/admin-log', {
        functionName: 'listAdminLog',
    });
}

/** Gives a puzzle a thumbs up (1), a thumbs down (-1), or takes the vote back (0). */
export function voteOnPuzzle(request: VoteRequest): Promise<AxiosResponse<VoteResponse>> {
    return axiosService.post<VoteResponse>('/puzzlebase/votes', request, {
        functionName: 'voteOnPuzzle',
    });
}

/** Fetches the top contributors by number of puzzles added. */
export function getLeaderboard(): Promise<AxiosResponse<LeaderboardEntry[]>> {
    return axiosService.get<LeaderboardEntry[]>('/puzzlebase/leaderboard', {
        functionName: 'getLeaderboard',
    });
}

/**
 * Fetches puzzles to train on: a random selection in a rating range, optionally in one bucket or
 * theme. Any signed-in member can train.
 */
export function getTrainingPuzzles({ exclude, ...query }: TrainQuery = {}): Promise<
    AxiosResponse<PuzzlebasePuzzle[]>
> {
    return axiosService.get<PuzzlebasePuzzle[]>('/puzzlebase/train', {
        params: { ...query, exclude: exclude?.join(',') || undefined },
        functionName: 'getTrainingPuzzles',
    });
}

/** Fetches the tags the puzzles have, to offer only what there are puzzles for when training. */
export function getTrainingTags(): Promise<AxiosResponse<TrainingTagSet[]>> {
    return axiosService.get<TrainingTagSet[]>('/puzzlebase/train/tags', {
        functionName: 'getTrainingTags',
    });
}

/** Records an attempt at a puzzle: every move tried, wrong ones too, and the time for each. */
export function submitAttempt(request: AttemptSubmission): Promise<AxiosResponse<PuzzleAttempt>> {
    return axiosService.post<PuzzleAttempt>('/puzzlebase/attempts', request, {
        functionName: 'submitAttempt',
    });
}

/** Fetches someone's puzzle stats. Members can see their own, and coaches and admins anyone's. */
export function getPuzzleStats(username: string): Promise<AxiosResponse<PuzzleStatsResponse>> {
    return axiosService.get<PuzzleStatsResponse>(`/puzzlebase/stats/${username}`, {
        functionName: 'getPuzzleStats',
    });
}

/** Fetches someone's sessions and attempts, by default for the last 30 days. */
export function getPuzzleRuns(
    username: string,
    range: { from?: string; to?: string } = {},
): Promise<AxiosResponse<PuzzleRunsResponse>> {
    return axiosService.get<PuzzleRunsResponse>(`/puzzlebase/runs/${username}`, {
        params: range,
        functionName: 'getPuzzleRuns',
    });
}

/**
 * Suggests tags for a puzzle. Any signed-in member can. The tags go to a review pile for Puzzle
 * Contributors, unless the caller is one: then they are applied to the puzzle at once. Sending no
 * tags withdraws the suggestion.
 */
export function suggestTags(
    puzzleId: string,
    request: SuggestTagsRequest,
): Promise<AxiosResponse<SuggestTagsResponse>> {
    return axiosService.post<SuggestTagsResponse>(
        `/puzzlebase/puzzles/${puzzleId}/suggestions`,
        request,
        { functionName: 'suggestTags' },
    );
}

/** The review pile: every puzzle with suggested tags. For Puzzle Contributors and admins. */
export function listSuggestions(): Promise<AxiosResponse<SuggestionSummary[]>> {
    return axiosService.get<SuggestionSummary[]>('/puzzlebase/suggestions', {
        functionName: 'listSuggestions',
    });
}

/** Accepts or dismisses the suggested tags of one puzzle. Returns the puzzle. */
export function resolveSuggestions(
    puzzleId: string,
    request: ResolveSuggestionsRequest,
): Promise<AxiosResponse<PuzzlebasePuzzle>> {
    return axiosService.post<PuzzlebasePuzzle>(
        `/puzzlebase/puzzles/${puzzleId}/suggestions/resolve`,
        request,
        { functionName: 'resolveSuggestions' },
    );
}
