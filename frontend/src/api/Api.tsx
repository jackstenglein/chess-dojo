'use client';

import { DiscordAuthRequest } from '@jackstenglein/chess-dojo-common/src/auth/discord';
import {
    AddDirectoryItemsRequestV2,
    CreateDirectoryRequestV2Client,
    ExportDirectoryRequest,
    GetDirectoryStatsRequest,
    ListBreadcrumbsRequest,
    MoveDirectoryItemsRequestV2,
    RemoveDirectoryItemsRequestV2,
    ShareDirectoryRequest,
    UpdateDirectoryRequestV2,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { ExamAttempt, ExamType } from '@jackstenglein/chess-dojo-common/src/database/exam';
import {
    CreateGameRequest,
    DeleteGamesRequest,
    UpdateGameRequest,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { FollowPositionRequest } from '@jackstenglein/chess-dojo-common/src/explorer/follower';
import { PgnMergeRequest } from '@jackstenglein/chess-dojo-common/src/pgn/merge';
import {
    GetPuzzleHistoryRequest,
    NextPuzzleRequest,
} from '@jackstenglein/chess-dojo-common/src/puzzles/api';
import {
    RoundRobinRegisterRequest,
    RoundRobinSubmitGameRequest,
    RoundRobinWithdrawRequest,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { ReactNode, createContext, useContext, useMemo } from 'react';
import { useAuth } from '../auth/Auth';
import { Club, ClubJoinRequestStatus } from '../database/club';
import { Course } from '../database/course';
import { Event } from '../database/event';
import { GameReviewType, PositionComment } from '../database/game';
import { Requirement } from '../database/requirement';
import { LeaderboardSite, TournamentType } from '../database/tournament';
import { User } from '../database/user';
import {
    ClubApiContextType,
    batchGetClubs,
    createClub,
    getClub,
    joinClub,
    leaveClub,
    listClubs,
    processJoinRequest,
    requestToJoinClub,
    updateClub,
} from './clubApi';
import {
    CourseApiContextType,
    getCourse,
    listAllCourses,
    listCourses,
    purchaseCourse,
    setCourse,
} from './courseApi';
import {
    DirectoryApiContextType,
    addDirectoryItems,
    checkDirectoryExport,
    createDirectory,
    deleteDirectories,
    exportDirectory,
    getDirectory,
    getDirectoryStats,
    listBreadcrumbs,
    moveDirectoryItems,
    removeDirectoryItem,
    shareDirectory,
    updateDirectory,
} from './directoryApi';
import { EmailApiContextType, SupportTicketRequest, createSupportTicket } from './emailApi';
import {
    EventApiContextType,
    bookEvent,
    cancelEvent,
    createMessage,
    deleteEvent,
    getEvent,
    getEventCheckout,
    listEvents,
    setEvent,
} from './eventApi';
import { ExamApiContextType, getExam, getExamAnswer, listExams, putExamAttempt } from './examApi';
import {
    ExplorerApiContextType,
    followPosition,
    getPosition,
    listFollowedPositions,
} from './explorerApi';
import {
    DeleteCommentRequest,
    GameApiContextType,
    UpdateCommentRequest,
    createComment,
    createGame,
    deleteComment,
    deleteGames,
    featureGame,
    getGame,
    listFeaturedGames,
    listGamesByCohort,
    listGamesByOpening,
    listGamesByOwner,
    listGamesByPosition,
    listGamesForReview,
    markReviewed,
    mergePgn,
    requestReview,
    updateComment,
    updateGame,
} from './gameApi';
import {
    GraduationApiContextType,
    listGraduationsByCohort,
    listGraduationsByDate,
    listGraduationsByOwner,
} from './graduationApi';
import {
    LiveClassesApiContextType,
    getGameReviewCohort,
    getRecording,
    listRecordings,
} from './liveClassesApi';
import {
    NewsfeedApiContextType,
    createNewsfeedComment,
    getNewsfeedItem,
    listNewsfeed,
    setNewsfeedReaction,
} from './newsfeedApi';
import {
    NotificationApiContextType,
    deleteAllNotifications,
    deleteNotification,
    listNotifications,
} from './notificationApi';
import {
    PaymentApiContextType,
    SubscriptionCheckoutRequest,
    createPaymentAccount,
    getPaymentAccount,
    paymentAccountLogin,
    subscriptionCheckout,
    subscriptionManage,
} from './paymentApi';
import { PuzzleApiContextType, getPuzzleHistory, nextPuzzle } from './puzzleApi';
import {
    RequirementApiContextType,
    getRequirement,
    listRequirements,
    setRequirement,
} from './requirementApi';
import {
    RoundRobinApiContextType,
    registerForRoundRobin,
    submitRoundRobinGame,
    withdrawFromRoundRobin,
} from './roundRobinApi';
import { ScoreboardApiContextType, getScoreboard } from './scoreboardApi';
import {
    OpenClassicalPutPairingsRequest,
    OpenClassicalRegistrationRequest,
    OpenClassicalSubmitResultsRequest,
    OpenClassicalVerifyResultRequest,
    TimeControl,
    TimePeriod,
    TournamentApiContextType,
    adminBanPlayer,
    adminCompleteTournament,
    adminEmailPairings,
    adminGetRegistrations,
    adminUnbanPlayer,
    adminVerifyResult,
    adminWithdrawPlayer,
    getLeaderboard,
    getOpenClassical,
    listPreviousOpenClassicals,
    putOpenClassicalPairings,
    registerForOpenClassical,
    submitResultsForOpenClassical,
} from './tournamentApi';
import {
    UpdateUserProgressRequest,
    UpdateUserTimelineRequest,
    UserApiContextType,
    checkUserAccess,
    discordAuth,
    editFollower,
    getFollower,
    getUser,
    getUserPublic,
    getUserStatistics,
    getUserSummaries,
    graduate,
    listFollowers,
    listFollowing,
    listUserTimeline,
    listUsersByCohort,
    searchUsers,
    updateUser,
    updateUserProgress,
    updateUserTimeline,
} from './userApi';

/**
 * ApiContextType defines the interface of the API as available through ApiProvider.
 */
export type ApiContextType = UserApiContextType &
    EventApiContextType &
    GameApiContextType &
    RequirementApiContextType &
    GraduationApiContextType &
    CourseApiContextType &
    TournamentApiContextType &
    NotificationApiContextType &
    NewsfeedApiContextType &
    ScoreboardApiContextType &
    ExplorerApiContextType &
    PaymentApiContextType &
    ClubApiContextType &
    ExamApiContextType &
    EmailApiContextType &
    DirectoryApiContextType &
    RoundRobinApiContextType &
    PuzzleApiContextType &
    LiveClassesApiContextType;

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const ApiContext = createContext<ApiContextType>(null!);

/**
 * @returns The current ApiContext value.
 */
export function useApi() {
    return useContext(ApiContext);
}

/**
 * ApiProvider provides access to API calls. It implements the ApiContextType interface.
 * ApiProvider must be a child of AuthProvider.
 * @param param0 React props. The only used prop is children.
 * @returns An ApiContext.Provider wrapping the provided children.
 */
export function ApiProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const idToken = auth.user?.cognitoUser?.tokens?.idToken?.toString() ?? '';

    const value = useMemo(() => {
        return {
            checkUserAccess: () => checkUserAccess(idToken),
            getUser: () => getUser(idToken),
            getUserPublic,
            getUserSummaries,
            listUserTimeline: (owner: string, startKey?: string) =>
                listUserTimeline(owner, startKey),
            listUsersByCohort: (cohort: string, startKey?: string) =>
                listUsersByCohort(idToken, cohort, startKey),
            searchUsers,
            updateUser: (update: Partial<User>, autopickCohort?: boolean) =>
                updateUser(idToken, update, auth.updateUser, autopickCohort),
            updateUserProgress: (request: UpdateUserProgressRequest) =>
                updateUserProgress(idToken, request, auth.updateUser),
            updateUserTimeline: (request: UpdateUserTimelineRequest) =>
                updateUserTimeline(idToken, request, auth.updateUser),
            graduate: (comments: string) => graduate(idToken, comments, auth.updateUser),
            getUserStatistics: () => getUserStatistics(),
            getFollower: (poster: string) => getFollower(idToken, poster),
            editFollower: (poster: string, action: 'follow' | 'unfollow') =>
                editFollower(idToken, poster, action),
            listFollowers: (username: string, startKey?: string) =>
                listFollowers(username, startKey),
            listFollowing: (username: string, startKey?: string) =>
                listFollowing(username, startKey),
            discordAuth: (request: DiscordAuthRequest) => discordAuth(idToken, request),

            bookEvent: (id: string, startTime?: Date, type?: string) =>
                bookEvent(idToken, id, startTime, type),
            getEventCheckout: (id: string) => getEventCheckout(idToken, id),
            cancelEvent: (id: string) => cancelEvent(idToken, id),
            deleteEvent: (id: string) => deleteEvent(idToken, id),
            getEvent: (id: string) => getEvent(idToken, id),
            listEvents: (startKey?: string) => listEvents(idToken, startKey),
            setEvent: (event: Partial<Event>) => setEvent(idToken, event),
            createMessage: (id: string, content: string) =>
                createMessage(idToken, auth.user, id, content),

            createGame: (req: CreateGameRequest) => createGame(idToken, req),
            getGame: (cohort: string, id: string) => getGame(cohort, id),
            featureGame: (cohort: string, id: string, featured: string) =>
                featureGame(idToken, cohort, id, featured),
            updateGame: (cohort: string, id: string, req: Partial<UpdateGameRequest>) =>
                updateGame(idToken, cohort, id, req),
            deleteGames: (request: DeleteGamesRequest) => deleteGames(idToken, request),
            listGamesByCohort: (
                cohort: string,
                startKey?: string,
                startDate?: string,
                endDate?: string,
            ) => listGamesByCohort(idToken, cohort, startKey, startDate, endDate),
            listGamesByOwner: (
                owner?: string,
                startKey?: string,
                startDate?: string,
                endDate?: string,
                player?: string,
                color?: string,
            ) => listGamesByOwner(idToken, owner, startKey, startDate, endDate, player, color),
            listGamesByOpening: (
                eco: string,
                startKey?: string,
                startDate?: string,
                endDate?: string,
            ) => listGamesByOpening(idToken, eco, startKey, startDate, endDate),
            listGamesByPosition: (fen: string, mastersOnly: boolean, startKey?: string) =>
                listGamesByPosition(idToken, fen, mastersOnly, startKey),
            listFeaturedGames: (startKey?: string) => listFeaturedGames(idToken, startKey),
            listGamesForReview: (startKey?: string) => listGamesForReview(idToken, startKey),
            createComment: (
                cohort: string,
                id: string,
                comment: PositionComment,
                existingComments: boolean,
            ) => createComment(idToken, cohort, id, comment, existingComments),
            updateComment: (update: UpdateCommentRequest) => updateComment(idToken, update),
            deleteComment: (request: DeleteCommentRequest) => deleteComment(idToken, request),
            requestReview: (cohort: string, id: string, reviewType: GameReviewType) =>
                requestReview(idToken, cohort, id, reviewType),
            markReviewed: (cohort: string, id: string) => markReviewed(idToken, cohort, id),
            mergePgn: (request: PgnMergeRequest) => mergePgn(idToken, request),

            getRequirement: (id: string) => getRequirement(idToken, id),
            listRequirements: (cohort: string, scoreboardOnly: boolean, startKey?: string) =>
                listRequirements(idToken, cohort, scoreboardOnly, startKey),
            setRequirement: (requirement: Requirement) => setRequirement(idToken, requirement),

            listGraduationsByCohort: (cohort: string, startKey?: string) =>
                listGraduationsByCohort(cohort, startKey),
            listGraduationsByOwner: (username: string, startKey?: string) =>
                listGraduationsByOwner(username, startKey),
            listGraduationsByDate: (startKey?: string) => listGraduationsByDate(startKey),

            getCourse: (type: string, id: string, checkoutId?: string) =>
                getCourse(idToken, type, id, checkoutId),
            listCourses: (type: string, startKey?: string) => listCourses(idToken, type, startKey),
            listAllCourses: (startKey?: string) => listAllCourses(startKey),
            purchaseCourse: (
                type: string,
                id: string,
                purchaseOption?: string,
                cancelUrl?: string,
            ) => purchaseCourse(idToken, type, id, purchaseOption, cancelUrl),
            setCourse: (course: Course) => setCourse(idToken, course),

            getLeaderboard: (
                site: LeaderboardSite,
                timePeriod: TimePeriod,
                tournamentType: TournamentType,
                timeControl: TimeControl,
                date: string,
            ) => getLeaderboard(site, timePeriod, tournamentType, timeControl, date),

            getOpenClassical: (startsAt?: string) => getOpenClassical(startsAt),
            registerForOpenClassical: (req: OpenClassicalRegistrationRequest) =>
                registerForOpenClassical(idToken, req),
            submitResultsForOpenClassical: (req: OpenClassicalSubmitResultsRequest) =>
                submitResultsForOpenClassical(idToken, req),
            putOpenClassicalPairings: (req: OpenClassicalPutPairingsRequest) =>
                putOpenClassicalPairings(idToken, req),
            listPreviousOpenClassicals: (startKey?: string) => listPreviousOpenClassicals(startKey),
            adminGetRegistrations: (region: string, section: string) =>
                adminGetRegistrations(idToken, region, section),
            adminBanPlayer: (username: string, region: string, section: string) =>
                adminBanPlayer(idToken, username, region, section),
            adminUnbanPlayer: (username: string) => adminUnbanPlayer(idToken, username),
            adminWithdrawPlayer: (username: string, region: string, section: string) =>
                adminWithdrawPlayer(idToken, username, region, section),
            adminEmailPairings: (round: number) => adminEmailPairings(idToken, round),
            adminVerifyResult: (request: OpenClassicalVerifyResultRequest) =>
                adminVerifyResult(idToken, request),
            adminCompleteTournament: (nextStartDate: string) =>
                adminCompleteTournament(idToken, nextStartDate),

            listNotifications: (startKey?: string) => listNotifications(idToken, startKey),
            deleteNotification: (id: string) => deleteNotification(idToken, id),
            deleteAllNotifications: () => deleteAllNotifications(idToken),

            getNewsfeedItem: (owner: string, id: string) => getNewsfeedItem(owner, id),
            listNewsfeed: (newsfeedIds: string[], skipLastFetch?: boolean, startKey?: string) =>
                listNewsfeed(idToken, newsfeedIds, skipLastFetch, startKey),
            createNewsfeedComment: (props: { owner: string; id: string }, content: string) =>
                createNewsfeedComment(idToken, props, content),
            setNewsfeedReaction: (owner: string, id: string, types: string[]) =>
                setNewsfeedReaction(idToken, owner, id, types),

            getScoreboard: (type: string) => getScoreboard(idToken, type),

            getPosition: (fen: string) => getPosition(idToken, fen),
            followPosition: (request: FollowPositionRequest) => followPosition(idToken, request),
            listFollowedPositions: () => listFollowedPositions(idToken),

            subscriptionCheckout: (request: SubscriptionCheckoutRequest) =>
                subscriptionCheckout(idToken, request),
            subscriptionManage: (tier?: SubscriptionTier, interval?: 'month' | 'year') =>
                subscriptionManage(idToken, tier, interval),
            createPaymentAccount: () => createPaymentAccount(idToken),
            getPaymentAccount: () => getPaymentAccount(idToken),
            paymentAccountLogin: () => paymentAccountLogin(idToken),

            createClub: (club: Partial<Club>) => createClub(idToken, club),
            updateClub: (id: string, data: Partial<Club>) => updateClub(idToken, id, data),
            listClubs: (startKey?: string) => listClubs(startKey),
            getClub: (id: string, scoreboard?: boolean) => getClub(id, scoreboard),
            batchGetClubs: (ids: string[]) => batchGetClubs(ids),
            joinClub: (id: string) => joinClub(idToken, id),
            requestToJoinClub: (id: string, notes: string) =>
                requestToJoinClub(idToken, id, notes, auth.user),
            processJoinRequest: (clubId: string, username: string, status: ClubJoinRequestStatus) =>
                processJoinRequest(idToken, clubId, username, status),
            leaveClub: (clubId: string) => leaveClub(idToken, clubId),

            getExam: (type: ExamType, id: string) => getExam(idToken, type, id),
            listExams: (type: ExamType, startKey?: string) => listExams(idToken, type, startKey),
            putExamAttempt: (
                examType: ExamType,
                examId: string,
                attempt: ExamAttempt,
                index?: number,
                totalScore?: number,
            ) => putExamAttempt(idToken, examType, examId, attempt, index, totalScore),
            getExamAnswer: (id: string) => getExamAnswer(idToken, id),

            createSupportTicket: (request: SupportTicketRequest) =>
                createSupportTicket(idToken, request),

            getDirectory: (owner: string, id: string) => getDirectory(idToken, owner, id),
            getDirectoryStats: (request: GetDirectoryStatsRequest) =>
                getDirectoryStats(idToken, request),
            listBreadcrumbs: (request: ListBreadcrumbsRequest) => listBreadcrumbs(idToken, request),
            createDirectory: (request: CreateDirectoryRequestV2Client) =>
                createDirectory(idToken, request),
            updateDirectory: (request: UpdateDirectoryRequestV2) =>
                updateDirectory(idToken, request),
            shareDirectory: (request: ShareDirectoryRequest) => shareDirectory(idToken, request),
            deleteDirectories: (owner: string, ids: string[]) =>
                deleteDirectories(idToken, owner, ids),
            addDirectoryItems: (request: AddDirectoryItemsRequestV2) =>
                addDirectoryItems(idToken, request),
            removeDirectoryItem: (request: RemoveDirectoryItemsRequestV2) =>
                removeDirectoryItem(idToken, request),
            moveDirectoryItems: (request: MoveDirectoryItemsRequestV2) =>
                moveDirectoryItems(idToken, request),
            exportDirectory: (request: ExportDirectoryRequest) => exportDirectory(idToken, request),
            checkDirectoryExport: (id: string) => checkDirectoryExport(idToken, id),

            registerForRoundRobin: (request: RoundRobinRegisterRequest) =>
                registerForRoundRobin(idToken, request),
            withdrawFromRoundRobin: (request: RoundRobinWithdrawRequest) =>
                withdrawFromRoundRobin(idToken, request),
            submitRoundRobinGame: (request: RoundRobinSubmitGameRequest) =>
                submitRoundRobinGame(idToken, request),

            nextPuzzle: (request: NextPuzzleRequest) => nextPuzzle(idToken, request),
            getPuzzleHistory: (request: GetPuzzleHistoryRequest) =>
                getPuzzleHistory(idToken, request),

            listRecordings,
            getRecording,
            getGameReviewCohort,
        };
    }, [idToken, auth.user, auth.updateUser]);

    return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}
