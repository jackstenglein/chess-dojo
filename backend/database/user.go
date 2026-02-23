package database

import (
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/aws/aws-sdk-go/service/dynamodb/expression"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
)

type SubscriptionStatus string
type SubscriptionTier string

const (
	SubscriptionStatus_Subscribed    SubscriptionStatus = "SUBSCRIBED"
	SubscriptionStatus_Canceled      SubscriptionStatus = "CANCELED"
	SubscriptionStatus_NotSubscribed SubscriptionStatus = "NOT_SUBSCRIBED"

	SubscriptionTier_Free       SubscriptionTier = "FREE"
	SubscriptionTier_Basic      SubscriptionTier = "BASIC"
	SubscriptionTier_Lecture    SubscriptionTier = "LECTURE"
	SubscriptionTier_GameReview SubscriptionTier = "GAME_REVIEW"
)

type DojoCohort string

var Cohorts = []DojoCohort{
	"0-300",
	"300-400",
	"400-500",
	"500-600",
	"600-700",
	"700-800",
	"800-900",
	"900-1000",
	"1000-1100",
	"1100-1200",
	"1200-1300",
	"1300-1400",
	"1400-1500",
	"1500-1600",
	"1600-1700",
	"1700-1800",
	"1800-1900",
	"1900-2000",
	"2000-2100",
	"2100-2200",
	"2200-2300",
	"2300-2400",
	"2400+",
}

const AllCohorts DojoCohort = "ALL_COHORTS"

const NoCohort DojoCohort = "NO_COHORT"

// IsValidCohort returns true if the provided cohort is valid.
func IsValidCohort(c DojoCohort) bool {
	if c == AllCohorts {
		return true
	}
	for _, c2 := range Cohorts {
		if c == c2 {
			return true
		}
	}
	return false
}

func (c DojoCohort) IsValid() bool {
	if c == AllCohorts {
		return true
	}
	for _, c2 := range Cohorts {
		if c == c2 {
			return true
		}
	}
	return false
}

// GetNextCohort returns the cohort after the provided one or
// NoCohort if none exist.
func (c DojoCohort) GetNextCohort() DojoCohort {
	for i, c2 := range Cohorts[:len(Cohorts)-1] {
		if c == c2 {
			return Cohorts[i+1]
		}
	}
	return NoCohort
}

type RatingSystem string

const (
	Chesscom RatingSystem = "CHESSCOM"
	Lichess  RatingSystem = "LICHESS"
	Fide     RatingSystem = "FIDE"
	Uscf     RatingSystem = "USCF"
	Ecf      RatingSystem = "ECF"
	Cfc      RatingSystem = "CFC"
	Dwz      RatingSystem = "DWZ"
	Acf      RatingSystem = "ACF"
	Knsb     RatingSystem = "KNSB"
	Custom         RatingSystem = "CUSTOM"
	Custom2        RatingSystem = "CUSTOM_2"
	Custom3        RatingSystem = "CUSTOM_3"
	TimeManagement RatingSystem = "TIME_MANAGEMENT"
)

// IsCustom returns true if the rating system is a custom rating system.
func (rs RatingSystem) IsCustom() bool {
	return rs == Custom || rs == Custom2 || rs == Custom3
}

var ratingSystems = []RatingSystem{
	Chesscom,
	Lichess,
	Fide,
	Uscf,
	Ecf,
	Cfc,
	Dwz,
	Acf,
	Knsb,
	Custom,
	Custom2,
	Custom3,
	TimeManagement,
}

type Rating struct {
	// The username/id of the user in this rating system
	Username string `dynamodbav:"username" json:"username"`

	// Whether to hide the username/id from other users
	HideUsername bool `dynamodbav:"hideUsername" json:"hideUsername"`

	// The user's rating at the time they joined the Dojo
	StartRating int `dynamodbav:"startRating" json:"startRating"`

	// The user's current rating
	CurrentRating int `dynamodbav:"currentRating" json:"currentRating"`

	// The user's current rating deviation, if known
	Deviation int `dynamodbav:"deviation,omitempty" json:"-"`

	// The number of games played, if known
	NumGames int `dynamodbav:"numGames,omitempty" json:"-"`

	// The name of the rating system. Only present if this is a custom rating.
	Name string `dynamodbav:"name,omitempty" json:"name,omitempty"`

	// Whether the user's rating is provisional
	IsProvisional bool `dynamodbav:"isProvisional,omitempty" json:"isProvisional,omitempty"`
}

type RatingHistory struct {
	// The date of the rating in ISO format.
	Date string `dynamodbav:"date" json:"date"`

	// The rating the user had at the given date.
	Rating int `dynamodbav:"rating" json:"rating"`
}

type User struct {
	// The user's Cognito username. Uniquely identifies a user
	Username string `dynamodbav:"username" json:"username"`

	// The user's email address used to log into the scoreboard
	Email string `dynamodbav:"email" json:"-"`

	// The user's email address used to log into the wix site
	WixEmail string `dynamodbav:"wixEmail" json:"-"`

	// The name of the user
	Name string `dynamodbav:"name" json:"-"`

	// The user's preferred display name on the site
	DisplayName string `dynamodbav:"displayName" json:"displayName"`

	// The user's Discord username
	DiscordUsername string `dynamodbav:"discordUsername" json:"discordUsername"`

	// The user's Discord id
	DiscordId string `dynamodbav:"discordId,omitempty" json:"discordId,omitempty"`

	// A search field of the form display:DisplayName_discord:DiscordUsername_[ratingSystem:RatingSystem.Username]
	// Stored in all lowercase. Each rating's username is only included if its HideUsername field is false.
	// Ex: display:jackst_discord:jackstenglein_chesscom:jackstenglein_uscf:12345
	SearchKey string `dynamodbav:"searchKey" json:"searchKey"`

	// The user's bio
	Bio string `dynamodbav:"bio" json:"bio"`

	// The user's coach bio. Only present if the user is a coach
	CoachBio string `dynamodbav:"coachBio,omitempty" json:"coachBio,omitempty"`

	// The user's preferred rating system
	RatingSystem RatingSystem `dynamodbav:"ratingSystem" json:"ratingSystem"`

	// The user's ratings in each rating system
	Ratings map[RatingSystem]*Rating `dynamodbav:"ratings" json:"ratings"`

	// A map from a rating system to a slice of RatingHistory objects for that rating system.
	RatingHistories map[RatingSystem][]RatingHistory `dynamodbav:"ratingHistories" json:"ratingHistories"`

	// The user's Dojo cohort
	DojoCohort DojoCohort `dynamodbav:"dojoCohort" json:"dojoCohort"`

	// Maps requirement ids to RequirementProgress objects
	Progress map[string]*RequirementProgress `dynamodbav:"progress" json:"progress"`

	// The number of games the user has created
	GamesCreated map[DojoCohort]int `dynamodbav:"gamesCreated" json:"gamesCreated"`

	// Whether the user is an admin or not
	IsAdmin bool `dynamodbav:"isAdmin" json:"isAdmin"`

	// Whether the user has admin privileges for the calendar
	IsCalendarAdmin bool `dynamodbav:"isCalendarAdmin" json:"isCalendarAdmin"`

	// Whether the user has admin privileges for tournaments
	IsTournamentAdmin bool `dynamodbav:"isTournamentAdmin" json:"isTournamentAdmin"`

	// Whether the user is a beta tester or not
	IsBetaTester bool `dynamodbav:"isBetaTester" json:"isBetaTester"`

	// Whether the user is a coach or not
	IsCoach bool `dynamodbav:"isCoach" json:"isCoach"`

	// When the user first created their account
	CreatedAt string `dynamodbav:"createdAt" json:"createdAt"`

	// The number of times the user has graduated
	NumberOfGraduations int `dynamodbav:"numberOfGraduations" json:"numberOfGraduations"`

	// The cohort the user most recently graduated from
	PreviousCohort DojoCohort `dynamodbav:"previousCohort" json:"previousCohort"`

	// The cohorts the user has graduated from
	GraduationCohorts []DojoCohort `dynamodbav:"graduationCohorts,stringset" json:"graduationCohorts"`

	// When the user most recently graduated
	LastGraduatedAt string `dynamodbav:"lastGraduatedAt" json:"lastGraduatedAt"`

	// When the user was most recently updated (not including nightly rating updates)
	UpdatedAt string `dynamodbav:"updatedAt" json:"updatedAt"`

	// Whether to enable light mode on the site
	EnableLightMode bool `dynamodbav:"enableLightMode" json:"enableLightMode"`

	// Whether to enable zen mode on the site
	EnableZenMode bool `dynamodbav:"enableZenMode,omitempty" json:"enableZenMode"`

	// The user's preferred timezone on the calendar
	TimezoneOverride string `dynamodbav:"timezoneOverride" json:"timezoneOverride"`

	// The user's preferred time format on the calendar
	TimeFormat string `dynamodbav:"timeFormat" json:"timeFormat"`

	// The user's list of custom tasks
	CustomTasks []*CustomTask `dynamodbav:"customTasks" json:"customTasks"`

	// Whether the user has finished creating their profile
	HasCreatedProfile bool `dynamodbav:"hasCreatedProfile" json:"hasCreatedProfile"`

	// A map from an opening module id to the user's progress on that opening module
	OpeningProgress map[string]*UserOpeningModule `dynamodbav:"openingProgress" json:"openingProgress"`

	// A map from a tutorial name to a boolean indicating whether the user has completed that tutorial
	Tutorials map[string]bool `dynamodbav:"tutorials" json:"tutorials"`

	// A map from a time period to the number of minutes the user has spent on tasks in that time period.
	MinutesSpent map[string]int `dynamodbav:"minutesSpent" json:"minutesSpent"`

	// Indicates whether the user has manually set their profile picture. If true, the profile picture
	// should not be changed when the user sets the Discord username
	ProfilePictureSet bool `dynamodbav:"profilePictureSet" json:"-"`

	// The number of users following this user.
	FollowerCount int `dynamodbav:"followerCount" json:"followerCount"`

	// The number of users this user follows.
	FollowingCount int `dynamodbav:"followingCount" json:"followingCount"`

	// The time the user last fetched their newsfeed in time.RFC3339 format.
	LastFetchedNewsfeed string `dynamodbav:"lastFetchedNewsfeed" json:"lastFetchedNewsfeed"`

	// How the user was referred to the program
	ReferralSource string `dynamodbav:"referralSource" json:"referralSource"`

	// The user's notification settings
	NotificationSettings UserNotificationSettings `dynamodbav:"notificationSettings" json:"notificationSettings"`

	// The user's total dojo score, across all cohorts
	TotalDojoScore float32 `dynamodbav:"totalDojoScore" json:"totalDojoScore"`

	// The ids of the user's purchased courses
	PurchasedCourses map[string]bool `dynamodbav:"purchasedCourses" json:"purchasedCourses"`

	// The user's subscription status. This must be a top-level attribute because it is a Dynamo GSI key.
	SubscriptionStatus SubscriptionStatus `dynamodbav:"subscriptionStatus" json:"subscriptionStatus"`

	// The user's subscription tier. This must be a top-level attribute because it is a Dynamo GSI key.
	SubscriptionTier SubscriptionTier `dynamodbav:"subscriptionTier,omitempty" json:"subscriptionTier,omitempty"`

	// The user's payment info
	PaymentInfo *PaymentInfo `dynamodbav:"paymentInfo" json:"paymentInfo"`

	// The user's coach info
	CoachInfo *CoachInfo `dynamodbav:"coachInfo,omitempty" json:"coachInfo,omitempty"`

	// The set of club ids the user is in
	Clubs []string `dynamodbav:"clubs,stringset,omitempty" json:"clubs,omitempty"`

	// The username of the user's Lichess account that was banned for ToS violation,
	// if they have been banned on Lichess.
	LichessBan string `dynamodbav:"lichessBan,omitempty" json:"-"`

	// A map from exam id to the user's summary for that exam
	Exams map[string]UserExamSummary `dynamodbav:"exams" json:"exams"`

	// The IDs of the user's pinned tasks.
	PinnedTasks []string `dynamodbav:"pinnedTasks,omitempty" json:"pinnedTasks"`

	// The day the user's week starts on. Sunday is 0; Saturday is 6.
	WeekStart int `dynamodbav:"weekStart,omitempty" json:"weekStart"`

	// The user's work goal settings
	WorkGoal *WorkGoalSettings `dynamodbav:"workGoal,omitempty" json:"workGoal,omitempty"`

	// The user's history of the work goal. New entries are added only when the work goal is changed.
	WorkGoalHistory []WorkGoalHistory `dynamodbav:"workGoalHistory,omitempty" json:"workGoalHistory,omitempty"`

	// The user's weekly training plan
	WeeklyPlan *WeeklyPlan `dynamodbav:"weeklyPlan,omitempty" json:"weeklyPlan,omitempty"`

	// The user's schedule of upcoming classical games
	GameSchedule []GameScheduleEntry `dynamodbav:"gameSchedule,omitempty" json:"gameSchedule"`

	// The user's firebase cloud messaging tokens
	FirebaseTokens []string `dynamodbav:"firebaseTokens,omitempty" json:"-"`

	// A map from puzzle theme to the user's overview stats for that theme. The user's
	// overall stats will be under the theme OVERALL.
	Puzzles map[string]PuzzleThemeOverview `dynamodbav:"puzzles,omitempty" json:"puzzles,omitempty"`

	// The id of the user's game review cohort, if they are a member of the Game & Profile Review tier.
	GameReviewCohortId string `dynamodbav:"gameReviewCohortId,omitempty" json:"gameReviewCohortId,omitempty"`

	// The time already on the user's timer, if it is paused.
	TimerSeconds int `dynamodbav:"timerSeconds,omitempty" json:"timerSeconds"`

	// The date the timer was last started or unpaused. If the timer is not running or paused, it will be empty.
	TimerStartedAt string `dynamodbav:"timerStartedAt,omitempty" json:"timerStartedAt"`
}

type PuzzleThemeOverview struct {
	// The user's rating for the theme.
	Rating float32 `dynamodbav:"rating" json:"rating"`
	// The user's rating deviation for the theme.
	RatingDeviation float32 `dynamodbav:"ratingDeviation" json:"ratingDeviation"`
	// The number of times the user has played a puzzle with the theme.
	Plays int `dynamodbav:"plays" json:"plays"`
	// The time the puzzle was last played, in ISO 8601.
	LastPlayed string `dynamodbav:"lastPlayed" json:"lastPlayed"`
}

// A summary of a user's performance on a single exam.
type UserExamSummary struct {
	// The type of the exam this summary refers to.
	ExamType ExamType `dynamodbav:"examType" json:"examType"`

	// The cohort range of the exam this summary refers to.
	CohortRange string `dynamodbav:"cohortRange" json:"cohortRange"`

	// The date the user took the exam, in time.RFC3339 format
	CreatedAt string `dynamodbav:"createdAt" json:"createdAt"`

	// The rating the user got on the exam, as determined by the exam's linear regression.
	Rating float32 `dynamodbav:"rating" json:"rating"`
}

type PaymentInfo struct {
	// The Stripe customer id
	CustomerId string `dynamodbav:"customerId" json:"customerId"`

	// The Stripe subscription id for the training program
	SubscriptionId string `dynamodbav:"subscriptionId" json:"-"`

	// The date the subscription was last updated
	UpdatedAt string `dynamodbav:"updatedAt" json:"updatedAt"`
}

type WorkGoalSettings struct {
	// A list of the minutes the user wants to work per day of the week.
	// Sunday is index 0; Saturday is index 6.
	MinutesPerDay []int `dynamodbav:"minutesPerDay" json:"minutesPerDay"`
}

type WorkGoalHistory struct {
	// The date the user set the work goal, in ISO 8601.
	Date string `dynamodbav:"date" json:"date"`

	// The user's work goal on the given date.
	WorkGoal WorkGoalSettings `dynamodbav:"workGoal" json:"workGoal"`
}

type WeeklyPlan struct {
	// The (exclusive) date the weekly plan ends, in ISO 8601.
	EndDate string `dynamodbav:"endDate" json:"endDate"`

	// The tasks in the plan, in a list ordered by the index of the day of the week.
	// Sunday is index 0; Saturday is index 6.
	Tasks [][]struct {
		// The id of the task
		Id string `dynamodbav:"id" json:"id"`
		// The work goal of the task in minutes
		Minutes int `dynamodbav:"minutes" json:"minutes"`
	} `dynamodbav:"tasks" json:"tasks"`

	// The date (in ISO 8601) the user's progress was most recently updated when the weekly plan was
	// last generated.
	ProgressUpdatedAt string `dynamodbav:"progressUpdatedAt" json:"progressUpdatedAt"`

	// The ids of the user's pinned tasks (in order) when the weekly plan was last generated.
	PinnedTasks []string `dynamodbav:"pinnedTasks,omitempty" json:"pinnedTasks,omitempty"`

	// The date (in ISO 8601) of the user's next scheduled game when the weekly plan was last generated.
	NextGame string `dynamodbav:"nextGame,omitempty" json:"nextGame"`

	// The ids of the user's skipped tasks (in order) when the weekly plan was last generated.
	SkippedTasks []string `dynamodbav:"skippedTasks,omitempty" json:"skippedTasks,omitempty"`
}

type GameScheduleEntry struct {
	// The date the game(s) will be played, in ISO 8601 format.
	Date string `dynamodbav:"date" json:"date"`

	// The number of games that will be played.
	Count int `dynamodbav:"count" json:"count"`
}

func (pi *PaymentInfo) GetCustomerId() string {
	if pi == nil {
		return ""
	}
	return pi.CustomerId
}

func (pi *PaymentInfo) GetSubscriptionId() string {
	if pi == nil {
		return ""
	}
	return pi.SubscriptionId
}

type CoachInfo struct {
	// The Stripe connected account id
	StripeId string `dynamodbav:"stripeId" json:"stripeId"`

	// Whether Stripe onboarding is complete
	OnboardingComplete bool `dynamodbav:"onboardingComplete" json:"onboardingComplete"`
}

type UserNotificationSettings struct {
	// The user's settings for Discord notifications
	DiscordNotificationSettings *DiscordNotificationSettings `dynamodbav:"discordNotificationSettings,omitempty" json:"discordNotificationSettings,omitempty"`

	// The user's settings for email notifications
	EmailNotificationSettings *EmailNotificationSettings `dynamodbav:"emailNotificationSettings,omitempty" json:"emailNotificationSettings,omitempty"`

	// The user's settings for in-site notifications
	SiteNotificationSettings *SiteNotificationSettings `dynamodbav:"siteNotificationSettings,omitempty" json:"siteNotificationSettings,omitempty"`
}

// The user's settings for Discord notifications.
type DiscordNotificationSettings struct {
	// Whether to disable notifications when a user's meeting is booked
	DisableMeetingBooking bool `dynamodbav:"disableMeetingBooking" json:"disableMeetingBooking"`

	// Whether to disable notifications when a user's meeting is cancelled
	DisableMeetingCancellation bool `dynamodbav:"disableMeetingCancellation" json:"disableMeetingCancellation"`

	// Whether to disable notifications when a user is invited to a calendar event
	DisableCalendarInvite bool `dynamodbav:"disableCalendarInvite" json:"disableCalendarInvite"`

	// Whether to disable notifications when a round robin starts
	DisableRoundRobinStart bool `dynamodbav:"disableRoundRobinStart" json:"disableRoundRobinStart"`
}

func (dns *DiscordNotificationSettings) GetDisableMeetingCancellation() bool {
	if dns == nil {
		return false
	}
	return dns.DisableMeetingCancellation
}

// The user's settings for email notifications.
type EmailNotificationSettings struct {
	// Whether to disable the Dojo Digest newsletter
	DisableNewsletter bool `dynamodbav:"disableNewsletter" json:"disableNewsletter"`

	// Whether to disable inactivity warnings
	DisableInactiveWarning bool `dynamodbav:"disableInactiveWarning" json:"disableInactiveWarning"`

	// Whether to disable notifications when a round robin starts
	DisableRoundRobinStart bool `dynamodbav:"disableRoundRobinStart" json:"disableRoundRobinStart"`

	// Whether to disable notifications when the user creates a subscription
	DisableSubscriptionCreated bool `dynamodbav:"disableSubscriptionCreated" json:"disableSubscriptionCreated"`
}

// The user's settings for in-site notifications.
type SiteNotificationSettings struct {
	// Whether to disable notifications on game comments
	DisableGameComment bool `dynamodbav:"disableGameComment" json:"disableGameComment"`

	// Whether to disable notifications on game comment replies
	DisableGameCommentReplies bool `dynamodbav:"disableGameCommentReplies" json:"disableGameCommentReplies"`

	// Whether to disable notifications on game reviews
	DisableGameReview bool `dynamodbav:"disableGameReview" json:"disableGameReview"`

	// Whether to disable notifications on new followers
	DisableNewFollower bool `dynamodbav:"disableNewFollower" json:"disableNewFollower"`

	// Whether to disable notifications on newsfeed comments
	DisableNewsfeedComment bool `dynamodbav:"disableNewsfeedComment" json:"disableNewsfeedComment"`

	// Whether to disable notifications on newsfeed reactions
	DisableNewsfeedReaction bool `dynamodbav:"disableNewsfeedReaction" json:"disableNewsfeedReaction"`

	// Whether to disable notifications when a user is invited to a calendar event
	DisableCalendarInvite bool `dynamodbav:"disableCalendarInvite" json:"disableCalendarInvite"`

	// Whether to hide prompt of changing cohort. If value set, the prompt will not be shown until saved date.
	HideCohortPromptUntil string `dynamodbav:"hideCohortPromptUntil" json:"hideCohortPromptUntil"`
}

// UserOpeningModule represents a user's progress on a specific opening module
type UserOpeningModule struct {
	// A list of booleans indicating whether the current exercise is complete
	Exercises []bool `dynamodbav:"exercises,omitempty" json:"exercises,omitempty"`
}

func (u *User) GetUsername() string {
	if u == nil {
		return ""
	}
	return u.Username
}

func (u *User) GetCohort() DojoCohort {
	if u == nil {
		return NoCohort
	}
	return u.DojoCohort
}

// GetRatings returns the start and current ratings in the user's preferred rating system.
func (u *User) GetRatings() (int, int) {
	if u == nil {
		return 0, 0
	}

	r := u.Ratings[u.RatingSystem]
	return r.StartRating, r.CurrentRating
}

// CalculateScore returns the user's score for the given list of requirements. The
// user's current cohort is used when calculating the score.
func (u *User) CalculateScore(requirements []*Requirement) float32 {
	if u == nil {
		return 0
	}
	var score float32 = 0
	for _, requirement := range requirements {
		p := u.Progress[requirement.Id]
		score += requirement.CalculateScore(u.DojoCohort, p)
	}
	return score
}

func (u *User) TimeSpentOnReqs(requirements []*Requirement) int {
	if u == nil {
		return 0
	}
	var minutes int
	for _, r := range requirements {
		p, ok := u.Progress[r.Id]
		if ok {
			minutes += p.MinutesSpent[u.DojoCohort]
		}
	}
	return minutes
}

func (u *User) TimeSpent() int {
	if u == nil {
		return 0
	}
	var minutes int
	for _, progress := range u.Progress {
		m := progress.MinutesSpent[u.DojoCohort]
		minutes += m
	}
	return minutes
}

func (u *User) GetRatingChange() int {
	start, current := u.GetRatings()
	if start == 0 {
		return 0
	}
	return current - start
}

func (u *User) getDisplayName() string {
	if u == nil {
		return ""
	}
	return u.DisplayName
}

func (u *User) getDiscordName() string {
	if u == nil {
		return ""
	}
	return u.DiscordUsername
}

func (u *User) getRating(rs RatingSystem) (string, bool) {
	if u == nil || u.Ratings == nil || u.Ratings[rs] == nil {
		return "", false
	}
	rating := u.Ratings[rs]
	return rating.Username, rating.HideUsername
}

func (u *User) IsSubscribed() bool {
	if u == nil {
		return false
	}
	return u.SubscriptionStatus == SubscriptionStatus_Subscribed
}

func (u *User) GetSubscriptionStatus() SubscriptionStatus {
	if u == nil {
		return SubscriptionStatus_NotSubscribed
	}
	return u.SubscriptionStatus
}

func (u *User) GetSubscriptionTier() SubscriptionTier {
	if u.GetSubscriptionStatus() != SubscriptionStatus_Subscribed {
		return SubscriptionTier_Free
	}
	if u.SubscriptionTier == "" {
		return SubscriptionTier_Basic
	}
	return u.SubscriptionTier
}

func (u *User) GetIsCalendarAdmin() bool {
	if u == nil {
		return false
	}
	return u.IsAdmin || u.IsCalendarAdmin
}

// UserUpdate contains pointers to fields included in the update of a user record. If a field
// should not be updated in a particular request, then it is set to nil.
// Some fields from the User type are removed as they cannot be updated. Other fields
// are ignored by the json encoder because they cannot be manually updated by the user.
type UserUpdate struct {
	// The user's preferred display name on the site
	DisplayName *string `dynamodbav:"displayName,omitempty" json:"displayName,omitempty"`

	// A search field of the form display:DisplayName_discord:DiscordUsername_[ratingSystem:RatingSystem.Username]
	// Stored in all lowercase. Each rating's username is only included if its HideUsername field is false.
	// Ex: display:jackst_discord:jackstenglein_chesscom:jackstenglein_uscf:12345
	// Cannot be manually passed by the user and is automatically set when any of the inner fields are updated.
	SearchKey *string `dynamodbav:"searchKey,omitempty" json:"-"`

	// The user's bio
	Bio *string `dynamodbav:"bio,omitempty" json:"bio,omitempty"`

	// The user's coach bio. Only present if the user is a coach
	CoachBio *string `dynamodbav:"coachBio,omitempty" json:"coachBio,omitempty"`

	// The user's preferred rating system
	RatingSystem *RatingSystem `dynamodbav:"ratingSystem,omitempty" json:"ratingSystem,omitempty"`

	// The user's ratings in each rating system
	Ratings *map[RatingSystem]*Rating `dynamodbav:"ratings,omitempty" json:"ratings,omitempty"`

	// The user's Dojo cohort
	DojoCohort *DojoCohort `dynamodbav:"dojoCohort,omitempty" json:"dojoCohort,omitempty"`

	// The number of times the user has graduated.
	// Cannot be manually passed by the user. The user should instead call the user/graduate function
	NumberOfGraduations *int `dynamodbav:"numberOfGraduations,omitempty" json:"-"`

	// The cohort the user most recently graduated from.
	// Cannot be manually passed by the user. The user should instead call the user/graduate function
	PreviousCohort *DojoCohort `dynamodbav:"previousCohort,omitempty" json:"-"`

	// The cohorts the user has graduated from
	// Cannot be manually passed by the user. The user should instead call the user/graduate function
	GraduationCohorts *[]DojoCohort `dynamodbav:"graduationCohorts,omitempty" json:"-"`

	// When the user most recently graduated
	// Cannot be manually passed by the user. The user should instead call the user/graduate function
	LastGraduatedAt *string `dynamodbav:"lastGraduatedAt,omitempty" json:"-"`

	// When the user was most recently updated (not including nightly rating updates)
	// Cannot be manually passed by the user and is updated automatically by the server
	UpdatedAt *string `dynamodbav:"updatedAt,omitempty" json:"-"`

	// Maps requirement ids to RequirementProgress objects.
	// Cannot be manually passed by the user. The user should instead call the user/progress/timeline function
	Progress *map[string]*RequirementProgress `dynamodbav:"progress,omitempty" json:"-"`

	// Whether to enable light mode on the site
	EnableLightMode *bool `dynamodbav:"enableLightMode,omitempty" json:"enableLightMode,omitempty"`

	// Whether to enable zen mode on the site
	EnableZenMode *bool `dynamodbav:"enableZenMode,omitempty" json:"enableZenMode,omitempty"`

	// The user's preferred timezone on the calendar
	TimezoneOverride *string `dynamodbav:"timezoneOverride,omitempty" json:"timezoneOverride,omitempty"`

	// The user's preferred time format on the calendar
	TimeFormat *string `dynamodbav:"timeFormat,omitempty" json:"timeFormat,omitempty"`

	// The user's list of custom tasks
	CustomTasks *[]*CustomTask `dynamodbav:"customTasks,omitempty" json:"customTasks,omitempty"`

	// Whether the user has finished creating their profile
	HasCreatedProfile *bool `dynamodbav:"hasCreatedProfile,omitempty" json:"hasCreatedProfile,omitempty"`

	// A map from an opening id to the user's progress on that opening
	OpeningProgress *map[string]*UserOpeningModule `dynamodbav:"openingProgress,omitempty" json:"openingProgress,omitempty"`

	// A map from a tutorial name to a boolean indicating whether the user has completed that tutorial
	Tutorials *map[string]bool `dynamodbav:"tutorials,omitempty" json:"tutorials,omitempty"`

	// A map from a time period to the number of minutes the user has spent on tasks in that time period.
	// Non-Dojo tasks are not included.
	MinutesSpent *map[string]int `dynamodbav:"minutesSpent,omitempty" json:"minutesSpent,omitempty"`

	// The user's profile picture as a base64 encoded string. This data gets saved to S3, not Dynamo.
	ProfilePictureData *string `dynamodbav:"-" json:"profilePictureData,omitempty"`

	// Indicates whether the user has manually set their profile picture. If true, the profile picture
	// should not be changed when the user sets the Discord username. This field cannot manually be
	// set by the user.
	ProfilePictureSet *bool `dynamodbav:"profilePictureSet,omitempty" json:"-"`

	// The time the user last fetched their newsfeed in time.RFC3339 format. This field cannot be
	// manually set by the user.
	LastFetchedNewsfeed *string `dynamodbav:"lastFetchedNewsfeed,omitempty" json:"-"`

	// How the user was referred to the program
	ReferralSource *string `dynamodbav:"referralSource,omitempty" json:"referralSource,omitempty"`

	// The user's notification settings
	NotificationSettings *UserNotificationSettings `dynamodbav:"notificationSettings,omitempty" json:"notificationSettings,omitempty"`

	// The ids of the user's purchased courses. This field cannot be manually set by the user.
	PurchasedCourses *map[string]bool `dynamodbav:"purchasedCourses,omitempty" json:"-"`

	// The user's subscription status. This field matches the value in PaymentInfo.SubscriptionStatus
	// and exists only to act as a top-level DynamoDB GSI key. Cannot be passed by the user.
	SubscriptionStatus *string `dynamodbav:"subscriptionStatus,omitempty" json:"-"`

	// The user's subscription tier. Cannot be passed by the user.
	SubscriptionTier *string `dynamodbav:"subscriptionTier,omitempty" json:"-"`

	// The user's payment info. This field cannot be manually set by the user.
	PaymentInfo *PaymentInfo `dynamodbav:"paymentInfo,omitempty" json:"-"`

	// The user's coach info. This field cannot be manually set by the user.
	CoachInfo *CoachInfo `dynamodbav:"coachInfo,omitempty" json:"-"`

	// The IDs of the user's pinned tasks.
	PinnedTasks *[]string `dynamodbav:"pinnedTasks,omitempty" json:"pinnedTasks,omitempty"`

	// The day the user's week starts on. Sunday is 0; Saturday is 6.
	WeekStart *int `dynamodbav:"weekStart,omitempty" json:"weekStart,omitempty"`

	// The work goal settings of the user.
	WorkGoal *WorkGoalSettings `dynamodbav:"workGoal,omitempty" json:"workGoal,omitempty"`

	// The user's history of the work goal. New entries are added only when the work goal is changed.
	WorkGoalHistory *[]WorkGoalHistory `dynamodbav:"workGoalHistory,omitempty" json:"workGoalHistory,omitempty"`

	// The user's weekly training plan.
	WeeklyPlan *WeeklyPlan `dynamodbav:"weeklyPlan,omitempty" json:"weeklyPlan,omitempty"`

	// The user's schedule of upcoming classical games
	GameSchedule *[]GameScheduleEntry `dynamodbav:"gameSchedule,omitempty" json:"gameSchedule,omitempty"`

	// The user's firebase cloud messaging tokens
	FirebaseTokens *[]string `dynamodbav:"firebaseTokens,omitempty" json:"firebaseTokens,omitempty"`

	// The time already on the user's timer, if it is paused.
	TimerSeconds *int `dynamodbav:"timerSeconds,omitempty" json:"timerSeconds,omitempty"`

	// The date the timer was last started or unpaused. If the timer is not running or paused, it will be empty.
	TimerStartedAt *string `dynamodbav:"timerStartedAt,omitempty" json:"timerStartedAt,omitempty"`
}

// AutopickCohort sets the UserUpdate's dojoCohort field based on the values of the ratingSystem
// and current rating fields. The chosen cohort is returned.
func (u *UserUpdate) AutopickCohort() DojoCohort {
	if u == nil || u.RatingSystem == nil || u.Ratings == nil {
		return NoCohort
	}

	rating, ok := (*u.Ratings)[*u.RatingSystem]
	if !ok {
		return NoCohort
	}

	currentRating := rating.CurrentRating
	cohort := getCohort(*u.RatingSystem, currentRating)
	u.DojoCohort = &cohort
	return cohort
}

func (u *UserUpdate) getDisplayName() string {
	if u == nil {
		return ""
	}
	if u.DisplayName == nil {
		return ""
	}
	return *u.DisplayName
}

func (u *UserUpdate) getRating(rs RatingSystem) (string, bool) {
	if u == nil || u.Ratings == nil || (*u.Ratings)[rs] == nil {
		return "", false
	}
	rating := (*u.Ratings)[rs]
	return rating.Username, rating.HideUsername
}

func GetSearchKey(user *User, update *UserUpdate) string {
	if user == nil && update == nil {
		return ""
	}

	displayName := update.getDisplayName()
	if displayName == "" {
		displayName = user.getDisplayName()
	}
	discordName := user.getDiscordName()

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("display:%s_discord:%s", displayName, discordName))

	for _, rs := range ratingSystems {
		username, hideUsername := update.getRating(rs)
		if username == "" {
			username, hideUsername = user.getRating(rs)
		}

		if username != "" && !hideUsername {
			sb.WriteString(fmt.Sprintf("_%s:%s", rs, username))
		}
	}

	return strings.ToLower(sb.String())
}

type UserCreator interface {
	// CreateUser creates a new User object with the provided information.
	CreateUser(username, email, name string, paymentInfo *PaymentInfo) (*User, error)
}

type UserGetter interface {
	// GetUser returns the User object with the provided username.
	GetUser(username string) (*User, error)
}

type UserLister interface {
	// ListUsersByCohort returns a list of Users in the provided cohort, up to 1MB of data.
	// startKey is an optional parameter that can be used to perform pagination.
	// The list of users and the next start key are returned.
	ListUsersByCohort(cohort DojoCohort, startKey string) ([]*User, string, error)

	// SearchUsers returns a list of users whose SearchKey field matches the provided query string and fields.
	// fields should be an array like ["display", "discord", "chesscom"] etc. The special value "all" can be
	// provided to indicate all fields are a match.
	SearchUsers(query string, fields []string, startKey string) ([]*User, string, error)
}

type UserUpdater interface {
	UserGetter

	// UpdateUser applies the specified update to the user with the provided username.
	UpdateUser(username string, update *UserUpdate) (*User, error)

	// RecordSubscriptionCancelation adds 1 cancelation to the user statistics for
	// the given cohort.
	RecordSubscriptionCancelation(cohort DojoCohort) error

	// RecordFreeTierConversion adds 1 conversion to the user statistics for
	// the given cohort.
	RecordFreeTierConversion(cohort DojoCohort) error

	ListTimelineEntries(owner string, startKey string) ([]*TimelineEntry, string, error)
}

type UserProgressUpdater interface {
	UserUpdater
	RequirementGetter
	TimelineEditor

	// UpdateUserProgress sets the given progress entry in the user's progress map.
	UpdateUserProgress(username string, progressEntry *RequirementProgress) (*User, error)
}

type AdminUserLister interface {
	UserGetter

	// ScanUsers returns a list of all Users in the database, up to 1MB of data.
	// startKey is an optional parameter that can be used to perform pagination.
	// The list of users and the next start key are returned.
	ScanUsers(startKey string) ([]*User, string, error)
}

// CreateUser creates a new User object with the provided information.
func (repo *dynamoRepository) CreateUser(username, email, name string, paymentInfo *PaymentInfo) (*User, error) {
	subscriptionStatus := SubscriptionStatus_NotSubscribed
	subscriptionTier := SubscriptionTier_Free
	if paymentInfo != nil {
		subscriptionStatus = SubscriptionStatus_Subscribed
		subscriptionTier = SubscriptionTier_Basic
	}

	user := &User{
		Username:           username,
		Email:              email,
		WixEmail:           email,
		Name:               name,
		CreatedAt:          time.Now().Format(time.RFC3339),
		DojoCohort:         NoCohort,
		PaymentInfo:        paymentInfo,
		SubscriptionStatus: subscriptionStatus,
		SubscriptionTier:   subscriptionTier,
	}

	err := repo.SetUserConditional(user, aws.String("attribute_not_exists(username)"))
	if err != nil {
		return nil, err
	}

	err = repo.createDefaultDirectories(user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// SetUserConditional saves the provided User object in the database using an optional condition statement.
func (repo *dynamoRepository) SetUserConditional(user *User, condition *string) error {
	if user.Username == "STATISTICS" {
		return errors.New(403, "Invalid request: cannot use username `STATISTICS`", "")
	}

	user.UpdatedAt = time.Now().Format(time.RFC3339)
	item, err := dynamodbattribute.MarshalMap(user)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Unable to marshal user", err)
	}

	// Hack to work around https://github.com/aws/aws-sdk-go/issues/682
	emptyMap := make(map[string]*dynamodb.AttributeValue)
	if len(user.Progress) == 0 {
		item["progress"] = &dynamodb.AttributeValue{M: emptyMap}
	}
	if len(user.Ratings) == 0 {
		item["ratings"] = &dynamodb.AttributeValue{M: emptyMap}
	}
	if len(user.RatingHistories) == 0 {
		item["ratingHistories"] = &dynamodb.AttributeValue{M: emptyMap}
	}
	if len(user.Exams) == 0 {
		item["exams"] = &dynamodb.AttributeValue{M: emptyMap}
	}

	input := &dynamodb.PutItemInput{
		ConditionExpression: condition,
		Item:                item,
		TableName:           aws.String(userTable),
	}

	_, err = repo.svc.PutItem(input)
	return errors.Wrap(500, "Temporary server error", "DynamoDB PutItem failure", err)
}

// createDefaultDirectories creates the default directories that a user should have when
// they first start using the Dojo.
func (repo *dynamoRepository) createDefaultDirectories(user *User) error {
	type directoryItemMetadata struct {
		CreatedAt   string `dynamodbav:"createdAt"`
		UpdatedAt   string `dynamodbav:"updatedAt"`
		Visibility  string `dynamodbav:"visibility"`
		Name        string `dynamodbav:"name"`
		Description string `dynamodbav:"description"`
	}

	type directoryItem struct {
		Type     string                `dynamodbav:"type"`
		ID       string                `dynamodbav:"id"`
		Metadata directoryItemMetadata `dynamodbav:"metadata"`
	}

	type directory struct {
		Owner       string                   `dynamodbav:"owner"`
		ID          string                   `dynamodbav:"id"`
		Parent      string                   `dynamodbav:"parent"`
		Name        string                   `dynamodbav:"name"`
		Description string                   `dynamodbav:"description,omitempty"`
		Visibility  string                   `dynamodbav:"visibility"`
		CreatedAt   string                   `dynamodbav:"createdAt"`
		UpdatedAt   string                   `dynamodbav:"updatedAt"`
		Items       map[string]directoryItem `dynamodbav:"items"`
		ItemIds     []string                 `dynamodbav:"itemIds"`
	}

	home := directory{
		Owner:      user.Username,
		ID:         "home",
		Parent:     "00000000-0000-0000-0000-000000000000",
		Name:       "Home",
		Visibility: "PUBLIC",
		CreatedAt:  user.CreatedAt,
		UpdatedAt:  user.CreatedAt,
		Items: map[string]directoryItem{
			"mygames": {
				Type: "DIRECTORY",
				ID:   "mygames",
				Metadata: directoryItemMetadata{
					CreatedAt:   user.CreatedAt,
					UpdatedAt:   user.CreatedAt,
					Visibility:  "PUBLIC",
					Name:        "My Games",
					Description: "Serious classical games I have played",
				},
			},
		},
		ItemIds: []string{"mygames"},
	}
	item, err := dynamodbattribute.MarshalMap(home)
	if err != nil {
		return err
	}

	input := &dynamodb.PutItemInput{
		Item:      item,
		TableName: aws.String(directoryTable),
	}
	_, err = repo.svc.PutItem(input)
	if err != nil {
		return err
	}

	mygames := directory{
		Owner:       user.Username,
		ID:          "mygames",
		Parent:      "home",
		Name:        "My Games",
		Description: "Serious classical games I have played",
		Visibility:  "PUBLIC",
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
	}
	item, err = dynamodbattribute.MarshalMap(mygames)
	if err != nil {
		return err
	}
	item["items"] = &dynamodb.AttributeValue{M: make(map[string]*dynamodb.AttributeValue)}
	item["itemIds"] = &dynamodb.AttributeValue{L: make([]*dynamodb.AttributeValue, 0)}
	input = &dynamodb.PutItemInput{
		Item:      item,
		TableName: aws.String(directoryTable),
	}
	_, err = repo.svc.PutItem(input)
	return err
}

// UpdateUser applies the specified update to the user with the provided username.
func (repo *dynamoRepository) UpdateUser(username string, update *UserUpdate) (*User, error) {
	if username == "STATISTICS" {
		return nil, errors.New(403, "Invalid request: cannot update username `STATISTICS`", "")
	}

	update.UpdatedAt = aws.String(time.Now().Format(time.RFC3339))

	encoder := dynamodbattribute.NewEncoder()
	encoder.NullEmptyString = false
	encoder.EnableEmptyCollections = true
	av, err := encoder.Encode(update)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Unable to marshal user update", err)
	}

	builder := expression.UpdateBuilder{}
	for k, v := range av.M {
		builder = builder.Set(expression.Name(k), expression.Value(v))
	}

	expr, err := expression.NewBuilder().WithUpdate(builder).Build()
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB expression building error", err)
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"username": {
				S: aws.String(username),
			},
		},
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		UpdateExpression:          expr.Update(),
		ConditionExpression:       aws.String("attribute_exists(username)"),
		TableName:                 aws.String(userTable),
		ReturnValues:              aws.String("ALL_NEW"),
	}
	result, err := repo.svc.UpdateItem(input)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB UpdateItem failure", err)
	}

	user := User{}
	if err := dynamodbattribute.UnmarshalMap(result.Attributes, &user); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal UpdateItem result", err)
	}
	return &user, nil
}

// UpdateUserProgress sets the given progress entry in the user's progress map.
func (repo *dynamoRepository) UpdateUserProgress(username string, progressEntry *RequirementProgress) (*User, error) {
	if username == "STATISTICS" {
		return nil, errors.New(403, "Invalid request: cannot update username `STATISTICS`", "")
	}

	pav, err := dynamodbattribute.Marshal(progressEntry)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Unable to marshal progress entry", err)
	}

	updatedAt := time.Now().Format(time.RFC3339)
	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"username": {
				S: aws.String(username),
			},
		},
		UpdateExpression: aws.String("SET #p.#id = :p, #u = :u"),
		ExpressionAttributeNames: map[string]*string{
			"#p":  aws.String("progress"),
			"#id": aws.String(progressEntry.RequirementId),
			"#u":  aws.String("updatedAt"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":p": pav,
			":u": {S: aws.String(updatedAt)},
		},
		ConditionExpression: aws.String("attribute_exists(username)"),
		ReturnValues:        aws.String("ALL_NEW"),
		TableName:           aws.String(userTable),
	}
	result, err := repo.svc.UpdateItem(input)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(404, "Invalid request: user does not exist", "DynamoDB conditional check failed", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem", err)
	}

	user := User{}
	if err := dynamodbattribute.UnmarshalMap(result.Attributes, &user); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal UpdateItem result", err)
	}
	return &user, nil
}

// GetUser returns the User object with the provided username.
func (repo *dynamoRepository) GetUser(username string) (*User, error) {
	if username == "STATISTICS" {
		return nil, errors.New(403, "Invalid request: cannot get username `STATISTICS`", "")
	}

	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"username": {
				S: aws.String(username),
			},
		},
		TableName: aws.String(userTable),
	}

	user := User{}
	if err := repo.getItem(input, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByDiscordId returns the User object with the provided Discord ID.
func (repo *dynamoRepository) GetUserByDiscordId(discordId string) (*User, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression:    aws.String("#discordId = :discordId"),
		ExpressionAttributeNames:  map[string]*string{"#discordId": aws.String("discordId")},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{":discordId": {S: aws.String(discordId)}},
		TableName:                 aws.String(userTable),
		IndexName:                 aws.String("DiscordIdIdx"),
	}

	var results []*User
	if _, err := repo.query(input, "", &results); err != nil {
		return nil, err
	}

	if len(results) < 1 {
		return nil, errors.New(404, fmt.Sprintf("Discord ID %q not found", discordId), "")
	}
	return results[0], nil
}

const ONE_MONTH_AGO = -time.Hour * 24 * 31

// ListUsersByCohort returns a list of Users in the provided cohort, up to 1MB of data.
// startKey is an optional parameter that can be used to perform pagination. Only active
// users are returned (updated within the past month).
// The list of users and the next start key are returned.
func (repo *dynamoRepository) ListUsersByCohort(cohort DojoCohort, startKey string) ([]*User, string, error) {
	if cohort == "STATISTICS" {
		return nil, "", errors.New(403, "Invalid request: cannot get cohort `STATISTICS`", "")
	}

	monthAgo := time.Now().Add(ONE_MONTH_AGO).Format(time.RFC3339)
	input := &dynamodb.QueryInput{
		KeyConditionExpression: aws.String("#cohort = :cohort"),
		ExpressionAttributeNames: map[string]*string{
			"#cohort": aws.String("dojoCohort"),
			"#u":      aws.String("updatedAt"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":cohort": {S: aws.String(string(cohort))},
			":u":      {S: aws.String(monthAgo)},
		},
		FilterExpression: aws.String("#u >= :u"),
		IndexName:        aws.String("CohortIdx"),
		TableName:        aws.String(userTable),
	}

	var users []*User
	lastKey, err := repo.query(input, startKey, &users)
	if err != nil {
		return nil, "", err
	}
	return users, lastKey, nil
}

// ScanUsers returns a list of all Users in the database, up to 1MB of data.
// startKey is an optional parameter that can be used to perform pagination.
// The list of users and the next start key are returned.
func (repo *dynamoRepository) ScanUsers(startKey string) ([]*User, string, error) {
	input := &dynamodb.ScanInput{
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":statistics": {
				S: aws.String("STATISTICS"),
			},
		},
		FilterExpression: aws.String("username <> :statistics"),
		TableName:        aws.String(userTable),
	}

	var users []*User
	lastKey, err := repo.scan(input, startKey, &users)
	if err != nil {
		return nil, "", err
	}
	return users, lastKey, nil
}

const ratingsProjection = "username, dojoCohort, subscriptionStatus, paymentInfo, wixEmail, updatedAt, progress, minutesSpent, ratingSystem, ratings, ratingHistories, lichessBan"

// ListUserRatings returns a list of Users matching the provided cohort, up to 1MB of data.
// Only the fields necessary for the rating/statistics update are returned.
// startkey is an optional parameter that can be used to perform pagination.
// The list of users and the next start key are returned.
func (repo *dynamoRepository) ListUserRatings(cohort DojoCohort, startKey string) ([]*User, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: aws.String("#cohort = :cohort"),
		ExpressionAttributeNames: map[string]*string{
			"#cohort": aws.String("dojoCohort"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":cohort": {S: aws.String(string(cohort))},
		},
		ProjectionExpression: aws.String(ratingsProjection),
		IndexName:            aws.String("CohortIdx"),
		TableName:            aws.String(userTable),
	}

	var users []*User
	lastKey, err := repo.query(input, startKey, &users)
	if err != nil {
		return nil, "", err
	}
	return users, lastKey, nil
}

func (repo *dynamoRepository) UpdateUserRatings(users []*User) error {
	if len(users) > 25 {
		return errors.New(500, "Temporary server error", "UpdateUserRatings has max limit of 25 users")
	}

	statements := make([]*dynamodb.BatchStatementRequest, 0, len(users))
	for _, user := range users {
		params, err := dynamodbattribute.MarshalList([]any{user.Ratings, user.RatingHistories, user.LichessBan, user.Username})
		if err != nil {
			return errors.Wrap(500, "Temporary server error", "Failed to marshal user.Ratings", err)
		}

		statement := &dynamodb.BatchStatementRequest{
			Statement: aws.String(fmt.Sprintf(
				"UPDATE \"%s\" SET ratings=? SET ratingHistories=? SET lichessBan=? WHERE username=?", userTable,
			)),
			Parameters: params,
		}
		statements = append(statements, statement)
	}

	input := &dynamodb.BatchExecuteStatementInput{
		Statements: statements,
	}
	log.Debugf("Batch execute statement input: %v", input)
	output, err := repo.svc.BatchExecuteStatement(input)
	log.Debugf("Batch execute statement output: %v", output)

	return errors.Wrap(500, "Temporary server error", "Failed BatchExecuteStatement", err)
}

const (
	AllCohortsPrefix = "ALL_COHORTS_"

	// Time spent in the user's current cohort
	AllTime     = "ALL_TIME"
	Last7Days   = "LAST_7_DAYS"
	Last30Days  = "LAST_30_DAYS"
	Last90Days  = "LAST_90_DAYS"
	Last365Days = "LAST_365_DAYS"

	// Time spent in any cohort
	AllCohortsAllTime     = "ALL_COHORTS_ALL_TIME"
	AllCohortsLast7Days   = "ALL_COHORTS_LAST_7_DAYS"
	AllCohortsLast30Days  = "ALL_COHORTS_LAST_30_DAYS"
	AllCohortsLast90Days  = "ALL_COHORTS_LAST_90_DAYS"
	AllCohortsLast365Days = "ALL_COHORTS_LAST_365_DAYS"
	AllCohortsNonDojo     = "ALL_COHORTS_NON_DOJO"
)

// UpdateUserTimes uses DynamoDB PartiQL to update the minutesSpent field on the provided users
func (repo *dynamoRepository) UpdateUserTimes(users []*User) error {
	if len(users) > 25 {
		return errors.New(500, "Temporary server error", "UpdateUserTimes has max limit of 25 users")
	}

	var sb strings.Builder
	statements := make([]*dynamodb.BatchStatementRequest, 0, len(users))
	for _, user := range users {
		params, err := dynamodbattribute.MarshalList([]interface{}{user.TotalDojoScore, user.MinutesSpent})
		if err != nil {
			return errors.Wrap(500, "Temporary server error", "Failed to marshal user.MinutesSpent", err)
		}

		sb.WriteString(fmt.Sprintf("UPDATE \"%s\"", userTable))
		sb.WriteString(" SET totalDojoScore=? SET minutesSpent=?")
		sb.WriteString(fmt.Sprintf(" WHERE username='%s'", user.Username))

		statement := &dynamodb.BatchStatementRequest{
			Statement:  aws.String(sb.String()),
			Parameters: params,
		}
		statements = append(statements, statement)

		sb.Reset()
	}

	input := &dynamodb.BatchExecuteStatementInput{
		Statements: statements,
	}
	log.Debugf("Batch execute statement input: %v", input)
	output, err := repo.svc.BatchExecuteStatement(input)
	log.Debugf("Batch execute statement output: %v", output)

	return errors.Wrap(500, "Temporary server error", "Failed BatchExecuteStatement", err)
}

func (repo *dynamoRepository) UpdateUserSubscriptionStatuses(users []*User) error {
	if len(users) > 25 {
		return errors.New(500, "Temporary server error", "UpdateUserSubscriptionStatuses has max limit of 25 users")
	}

	var sb strings.Builder
	statements := make([]*dynamodb.BatchStatementRequest, 0, len(users))
	for _, user := range users {
		params, err := dynamodbattribute.MarshalList([]any{user.GetSubscriptionStatus(), user.GetSubscriptionTier()})
		if err != nil {
			return errors.Wrap(500, "Temporary server error", "Failed to marshal user.PaymentInfo", err)
		}

		sb.WriteString(fmt.Sprintf("UPDATE \"%s\"", userTable))
		sb.WriteString(" SET subscriptionStatus=? subscriptionTier=?")
		sb.WriteString(fmt.Sprintf(" WHERE username='%s'", user.Username))

		statement := &dynamodb.BatchStatementRequest{
			Statement:  aws.String(sb.String()),
			Parameters: params,
		}
		statements = append(statements, statement)

		sb.Reset()
	}

	input := &dynamodb.BatchExecuteStatementInput{
		Statements: statements,
	}
	log.Debugf("Batch execute statement input: %v", input)
	output, err := repo.svc.BatchExecuteStatement(input)
	log.Debugf("Batch execute statement output: %v", output)

	return errors.Wrap(500, "Temporary server error", "Failed BatchExecuteStatement", err)
}

// RecordGameCreation updates the given user to increase their game creation stats.
func (repo *dynamoRepository) RecordGameCreation(user *User, amount int) error {
	if user.GamesCreated == nil {
		user.GamesCreated = make(map[DojoCohort]int)
	}

	count := user.GamesCreated[user.DojoCohort]
	user.GamesCreated[user.DojoCohort] = count + amount
	return repo.SetUserConditional(user, nil)
}

// DeleteUser deletes the user with the given username
func (repo *dynamoRepository) DeleteUser(username string) error {
	if username == "STATISTICS" {
		return errors.New(403, "Invalid request: cannot delete username `STATISTICS`", "")
	}

	input := &dynamodb.DeleteItemInput{
		ConditionExpression: aws.String("attribute_exists(username)"),
		Key: map[string]*dynamodb.AttributeValue{
			"username": {S: aws.String(username)},
		},
		TableName: aws.String(userTable),
	}
	_, err := repo.svc.DeleteItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed DynamoDB DeleteItem", err)
}

// SearchUsers returns a list of users whose SearchKey field matches the provided query string and fields.
// fields should be an array like ["display", "discord", "chesscom"] etc. The special value "all" can be
// provided to indicate all fields are a match.
func (repo *dynamoRepository) SearchUsers(query string, fields []string, startKey string) ([]*User, string, error) {
	query = strings.ToLower(query)

	var filter strings.Builder
	expressionAttrNames := map[string]*string{
		"#search": aws.String("searchKey"),
	}
	expressionAttrValues := make(map[string]*dynamodb.AttributeValue)

	for i, field := range fields {
		var attrValue *dynamodb.AttributeValue

		field = strings.ToLower(field)
		if field == "all" {
			attrValue = &dynamodb.AttributeValue{S: aws.String(query)}
		} else {
			attrValue = &dynamodb.AttributeValue{S: aws.String(fmt.Sprintf("%s:%s", field, query))}
		}

		if i > 0 {
			filter.WriteString(" OR ")
		}
		filter.WriteString(fmt.Sprintf("contains (#search, :field%d)", i))
		expressionAttrValues[fmt.Sprintf(":field%d", i)] = attrValue
	}

	input := &dynamodb.ScanInput{
		FilterExpression:          aws.String(filter.String()),
		ExpressionAttributeNames:  expressionAttrNames,
		ExpressionAttributeValues: expressionAttrValues,
		IndexName:                 aws.String("SearchIdx"),
		TableName:                 aws.String(userTable),
	}

	var users []*User
	lastKey, err := repo.scan(input, startKey, &users)
	if err != nil {
		return nil, "", err
	}
	return users, lastKey, nil
}

// BatchGetUsers returns a list of users with the provided usernames.
func (repo *dynamoRepository) BatchGetUsers(usernames []string) ([]*User, error) {
	return repo.BatchGetUsersProjection(usernames, "")
}

// BatchGetUsers returns a list of users with the provided usernames and the provided projection expression.
func (repo *dynamoRepository) BatchGetUsersProjection(usernames []string, projectionExpression string) ([]*User, error) {
	if len(usernames) == 0 {
		return []*User{}, nil
	}
	if len(usernames) > 100 {
		return nil, errors.New(500, "Temporary server error", "More than 100 items in BatchGetUsers request")
	}

	input := &dynamodb.BatchGetItemInput{
		RequestItems: map[string]*dynamodb.KeysAndAttributes{
			userTable: {
				Keys: []map[string]*dynamodb.AttributeValue{},
			},
		},
	}

	if projectionExpression != "" {
		input.RequestItems[userTable].ProjectionExpression = &projectionExpression
	}

	for _, u := range usernames {
		key := map[string]*dynamodb.AttributeValue{
			"username": {S: aws.String(u)},
		}
		input.RequestItems[userTable].Keys = append(input.RequestItems[userTable].Keys, key)
	}

	result, err := repo.svc.BatchGetItem(input)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed call to BatchGetItem", err)
	}
	list := result.Responses[userTable]

	var resultEntries []*User
	if err := dynamodbattribute.UnmarshalListOfMaps(list, &resultEntries); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal BatchGetItem result", err)
	}
	return resultEntries, nil
}
