import {
    getSubscriptionStatus,
    getSubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import ReactGA from 'react-ga4';
import { User } from '../database/user';

export enum EventType {
    // API events
    ApiRequest = 'api_request',

    // Auth events
    Login = 'login',
    Logout = 'logout',
    Signup = 'signup',
    SignupConfirm = 'signup_confirm',
    ForgotPassword = 'forgot_password',
    ForgotPasswordConfirm = 'forgot_password_confirm',

    // Profile actions
    CreateProfile = 'create_profile',
    EditProfile = 'edit_profile',
    Graduate = 'graduate',
    DownloadGradBox = 'download_grad_box',
    UpdateProgress = 'update_progress',
    UpdateTimeline = 'update_timeline',
    ResetProgress = 'reset_progress',
    CreateNondojoTask = 'create_nondojo_task',
    EditNondojoTask = 'edit_nondojo_task',
    DeleteNondojoTask = 'delete_nondojo_task',
    CreateCustomPlan = 'create_custom_plan',
    DeleteCustomPlan = 'delete_custom_plan',
    SwitchTrainingPlan = 'switch_training_plan',
    ViewTaskDetails = 'view_task_details',
    OpenProgramTips = 'open_program_tips',

    // Game actions
    SubmitGame = 'submit_game',
    UpdateGame = 'update_game',
    DeleteGame = 'delete_game',
    SearchGames = 'search_games',

    // Calendar actions
    SetAvailability = 'set_availability',
    BookAvailability = 'book_availability',
    BookCoaching = 'book_coaching',
    CancelMeeting = 'cancel_meeting',

    // Material actions
    CreateSparringLink = 'create_sparring_link',
    CopyFen = 'copy_fen',

    // World Championship prediction contest
    WcPickStart = 'wc_pick_start',
    WcPickStep = 'wc_pick_step',
    WcPredictionSubmit = 'wc_prediction_submit',
    WcShare = 'wc_share',
    WcOfferClick = 'wc_offer_click',

    // Dojo Rush landing page
    RushDemoStart = 'rush_demo_start',
    RushDemoFinish = 'rush_demo_finish',
    RushDemoReview = 'rush_demo_review',
    RushDemoUnlock = 'rush_demo_unlock',
    RushDemoCodeCopy = 'rush_demo_code_copy',
    RushDemoLeadStart = 'rush_demo_lead_start',
    RushDemoLead = 'rush_demo_lead',
    RushDemoOfferClick = 'rush_demo_offer_click',
    RushDemoShare = 'rush_demo_share',

    // Class landing page
    ClassLead = 'class_lead',

    // Upsell
    ViewUpsellDialog = 'view_upsell_dialog',

    // Error events
    ErrorBoundary = 'error_boundary',
    PgnErrorBoundary = 'pgn_error_boundary',

    // Directory actions
    CreateDirectory = 'create_directory',
    UpdateDirectory = 'update_directory',
    DeleteDirectory = 'delete_directory',
    AddDirectoryItems = 'add_directory_items',
    RemoveDirectoryItems = 'remove_directory_items',
    MoveDirectoryItems = 'move_directory_items',

    /** Signifies a user has begun a checkout. */
    BeginCheckout = 'begin_checkout',
}

export function trackEvent(type: EventType, params?: unknown) {
    ReactGA.event(type, params);
}

export function setUserProperties(user: User) {
    ReactGA.set({ userId: user.username });
    ReactGA.gtag('set', 'user_properties', {
        username: user.username,
        dojo_cohort: user.dojoCohort,
        subscription_status: getSubscriptionStatus(user),
        subscription_tier: getSubscriptionTier(user),
    });
}
