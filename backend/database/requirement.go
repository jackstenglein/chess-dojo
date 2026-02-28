package database

import (
	"math"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
)

type RequirementStatus string

const (
	Active   RequirementStatus = "ACTIVE"
	Archived RequirementStatus = "ARCHIVED"
)

type ScoreboardDisplay string

const (
	Unspecified ScoreboardDisplay = ""
	Hidden      ScoreboardDisplay = "HIDDEN"
	Checkbox    ScoreboardDisplay = "CHECKBOX"
	ProgressBar ScoreboardDisplay = "PROGRESS_BAR"
	NonDojo     ScoreboardDisplay = "NON_DOJO"
	Yearly      ScoreboardDisplay = "YEARLY"
)

func (s ScoreboardDisplay) IsValid() bool {
	return s == Hidden || s == Checkbox || s == ProgressBar || s == NonDojo || s == Yearly
}

type Task interface {
	// Returns the score for the given requirement based on the provided
	// cohort and progress.
	CalculateScore(cohort DojoCohort, progress *RequirementProgress) float32
	// Returns the score for the given requirement based on the provided
	// count of completed units.
	CalculateScoreCount(cohort DojoCohort, count int) float32
	// Returns true if the given progress is expired for the task.
	IsExpired(progress *RequirementProgress) bool
	// Returns the number of cohorts the task needs to be completed in.
	GetNumberOfCohorts() int
	// Returns the name of the task.
	GetName() string
	// Returns the requirement category of the task.
	GetCategory() string
	// Returns the scoreboard display of the task.
	GetScoreboardDisplay() ScoreboardDisplay
	// Returns the progress bar suffix of the task.
	GetProgressBarSuffix() string
	// Returns the counts of the task.
	GetCounts() map[DojoCohort]int
	// Returns true if the task is custom-created by the user.
	IsCustom() bool
}

// CustomTask contains the fields for a user-entered task.
type CustomTask struct {
	// Uniquely identifies a custom requirement.
	Id string `dynamodbav:"id" json:"id"`

	// The username of the owner of the custom task.
	Owner string `dynamodbav:"owner" json:"owner"`

	// The display name of the task
	Name string `dynamodbav:"name" json:"name"`

	// The description of the task
	Description string `dynamodbav:"description" json:"description"`

	// The total number of units in the task, by cohort
	// ALL_COHORTS is *not* a valid value.
	Counts map[DojoCohort]int `dynamodbav:"counts" json:"counts"`

	// The minimum starting value, applied to all cohorts. For example, the M2s start at 307
	// NOTE: Some user data predates the addition of this field, so to ensure backwards compatibility,
	//       this field is optional.
	StartCount *int `dynamodbav:"startCount,omitempty" json:"startCount"`

	// Must be NonDojo
	ScoreboardDisplay ScoreboardDisplay `dynamodbav:"scoreboardDisplay" json:"scoreboardDisplay"`

	// The category of the custom task.
	Category string `dynamodbav:"category" json:"category"`

	// The number of cohorts the requirement needs to be completed in before it
	// stops being suggested. For requirements that restart their progress in every
	// cohort, this is the special value -1.
	NumberOfCohorts int `dynamodbav:"numberOfCohorts" json:"numberOfCohorts"`

	// An optional string that is used to label the count of the progress bar.
	ProgressBarSuffix string `dynamodbav:"progressBarSuffix,omitempty" json:"progressBarSuffix"`

	// The time the task was most recently updated
	UpdatedAt string `dynamodbav:"updatedAt" json:"updatedAt"`
}

func (t *CustomTask) CalculateScore(cohort DojoCohort, progress *RequirementProgress) float32 {
	return 0
}

func (t *CustomTask) CalculateScoreCount(cohort DojoCohort, count int) float32 {
	return 0
}

func (t *CustomTask) IsExpired(progress *RequirementProgress) bool {
	return false
}

func (t *CustomTask) GetNumberOfCohorts() int {
	return t.NumberOfCohorts
}

func (t *CustomTask) GetName() string {
	return t.Name
}

func (t *CustomTask) GetCategory() string {
	return t.Category
}

func (t *CustomTask) GetScoreboardDisplay() ScoreboardDisplay {
	return t.ScoreboardDisplay
}

func (t *CustomTask) GetProgressBarSuffix() string {
	return t.ProgressBarSuffix
}

func (t *CustomTask) GetCounts() map[DojoCohort]int {
	return t.Counts
}

func (t *CustomTask) IsCustom() bool {
	return true
}

// Position contains the field for a sparring position.
type Position struct {
	// An optional title associated with the position
	Title string `dynamodbav:"title" json:"title"`

	// The FEN of the position
	Fen string `dynamodbav:"fen" json:"fen"`

	// The time limit in seconds the position is meant to be played at
	LimitSeconds int `dynamodbav:"limitSeconds" json:"limitSeconds"`

	// The time increment in seconds the position is meant to be played at
	IncrementSeconds int `dynamodbav:"incrementSeconds" json:"incrementSeconds"`

	// The expected result of the position
	Result string `dynamodbav:"result" json:"result"`
}

type Requirement struct {
	// Uniquely identifies a requirement. The sort key for the table.
	Id string `dynamodbav:"id" json:"id"`

	// Identifies whether the requirement is active or not. The partition key for the table.
	Status RequirementStatus `dynamodbav:"status" json:"status"`

	// The category that the requirement is in (Ex: Tactics)
	Category string `dynamodbav:"category" json:"category"`

	// The display name of the requirement
	Name string `dynamodbav:"name" json:"name"`

	// The short name of the requirement
	ShortName string `dynamodbav:"shortName,omitempty" json:"shortName,omitempty"`

	// The daily name of the requirement
	DailyName string `dynamodbav:"dailyName,omitempty" json:"dailyName,omitempty"`

	// The description of the requirement
	Description string `dynamodbav:"description" json:"description"`

	// The description of the requirement on the free tier
	FreeDescription string `dynamodbav:"freeDescription" json:"freeDescription"`

	// The total number of units in the requirement, by cohort
	// ALL_COHORTS is *not* a valid value.
	Counts map[DojoCohort]int `dynamodbav:"counts" json:"counts"`

	// The minimum starting value, applied to all cohorts. For example, the M2s start at 307
	StartCount int `dynamodbav:"startCount" json:"startCount"`

	// The number of cohorts the requirement must be completed in before completion
	// is "carried over" to new cohorts
	NumberOfCohorts int `dynamodbav:"numberOfCohorts" json:"numberOfCohorts"`

	// The score per unit. Applies to all cohorts unless overridden in UnitScoreOverride.
	UnitScore float32 `dynamodbav:"unitScore" json:"unitScore"`

	// The score per unit for each cohort. Overrides UnitScore if set for a particular cohort.
	// If not set for a cohort, UnitScore is used for that cohort.
	UnitScoreOverride map[DojoCohort]float32 `dynamodbav:"unitScoreOverride" json:"unitScoreOverride"`

	// The total score received after completing the requirement. Overrides UnitScore
	// and UnitScoreOverride if non-zero.
	TotalScore float32 `dynamodbav:"totalScore" json:"totalScore"`

	// The URLs of the videos describing the requirement, if any exist
	VideoUrls []string `dynamodbav:"videoUrls" json:"videoUrls"`

	// The positions included in the requirement, if any exist
	Positions []*Position `dynamodbav:"positions" json:"positions"`

	// How the requirement should be displayed on the scoreboard.
	ScoreboardDisplay ScoreboardDisplay `dynamodbav:"scoreboardDisplay" json:"scoreboardDisplay"`

	// Optional suffix to be displayed on progress bar label.
	ProgressBarSuffix string `dynamodbav:"progressBarSuffix" json:"progressBarSuffix"`

	// The time the requirement was most recently updated
	UpdatedAt string `dynamodbav:"updatedAt" json:"updatedAt"`

	// The priority in which to sort this requirement when displaying to the user
	SortPriority string `dynamodbav:"sortPriority" json:"sortPriority"`

	// The number of days after which completion of the requirement expires
	ExpirationDays int `dynamodbav:"expirationDays" json:"expirationDays"`

	// Whether the requirement is available on the free tier or not
	IsFree bool `dynamodbav:"isFree" json:"isFree"`

	// A list of requirement IDs which must be completed before this requirement can
	// be updated.
	Blockers []string `dynamodbav:"blockers" json:"blockers"`

	// Indicates whether the task must be fully complete before the suggested task
	// algorithm skips over it.
	Atomic bool `dynamodbav:"atomic" json:"atomic"`

	// The expected amount of time it takes to complete the task.
	ExpectedMinutes int `dynamodbav:"expectedMinutes,omitempty" json:"expectedMinutes"`

	// The subscription tiers that have access to this task.
	SubscriptionTiers []SubscriptionTier `dynamodbav:"subscriptionTiers,omitempty" json:"subscriptionTiers,omitempty"`
}

func (r *Requirement) clampCount(cohort DojoCohort, count int) int {
	return (int)(math.Max(math.Min(float64(count), float64(r.Counts[cohort])), float64(r.StartCount)))
}

// CalculateScore returns the score for the given requirement based on the provided
// cohort and progress.
func (r *Requirement) CalculateScore(cohort DojoCohort, progress *RequirementProgress) float32 {
	if r == nil || progress == nil {
		return 0
	}
	if r.ScoreboardDisplay == NonDojo {
		return 0
	}
	if _, ok := r.Counts[cohort]; !ok {
		return 0
	}
	if r.IsExpired(progress) {
		return 0
	}

	var count int
	if r.NumberOfCohorts == 1 || r.NumberOfCohorts == 0 {
		count = progress.Counts[AllCohorts]
	} else if r.NumberOfCohorts > 1 && len(progress.Counts) >= r.NumberOfCohorts {
		if c, ok := progress.Counts[cohort]; ok {
			count = c
		} else {
			for _, c := range progress.Counts {
				if c > count {
					count = c
				}
			}
		}
	} else {
		count = progress.Counts[cohort]
	}

	return r.CalculateScoreCount(cohort, count)
}

// CalculateScoreCount returns the score for the given requirement based on the provided count
// of completed units.
func (r *Requirement) CalculateScoreCount(cohort DojoCohort, count int) float32 {
	if r.TotalScore > 0 {
		if count >= r.Counts[cohort] {
			return r.TotalScore
		}
		return 0
	}

	unitScore := r.UnitScore
	if unitScoreOverride, ok := r.UnitScoreOverride[cohort]; ok {
		unitScore = unitScoreOverride
	}

	count = r.clampCount(cohort, count)
	return float32(math.Max(float64(count-r.StartCount), 0)) * unitScore
}

// Returns true if the given progress is expired for the requirement.
func (r *Requirement) IsExpired(progress *RequirementProgress) bool {
	if r.ExpirationDays <= 0 || progress == nil {
		return false
	}

	expirationDate, err := time.Parse(time.RFC3339, progress.UpdatedAt)
	if err != nil {
		return false
	}

	expirationDate = expirationDate.Add(time.Duration(r.ExpirationDays) * time.Hour * 24)
	return time.Now().After(expirationDate)
}

func (r *Requirement) GetNumberOfCohorts() int {
	return r.NumberOfCohorts
}

func (r *Requirement) GetName() string {
	if r.ShortName != "" {
		return r.ShortName
	}
	return r.Name
}

func (r *Requirement) GetCategory() string {
	return r.Category
}

func (r *Requirement) GetScoreboardDisplay() ScoreboardDisplay {
	return r.ScoreboardDisplay
}

func (r *Requirement) GetProgressBarSuffix() string {
	return r.ProgressBarSuffix
}

func (r *Requirement) GetCounts() map[DojoCohort]int {
	return r.Counts
}

func (r *Requirement) IsCustom() bool {
	return false
}

type RequirementProgress struct {
	// The id of the requirement that the progress applies to
	RequirementId string `dynamodbav:"requirementId" json:"requirementId"`

	// The current number of units completed in the requirement, by cohort.
	// ALL_COHORTS *is* a valid value.
	Counts map[DojoCohort]int `dynamodbav:"counts" json:"counts"`

	// The number of minutes spent working on the requirement, by cohort.
	// ALL_COHORTS is *not* a valid value.
	MinutesSpent map[DojoCohort]int `dynamodbav:"minutesSpent" json:"minutesSpent"`

	// The time the requirement was most recently updated
	UpdatedAt string `dynamodbav:"updatedAt" json:"updatedAt"`
}

type RequirementLister interface {
	// ListRequirements fetches a list of requirements matching the provided cohort. If scoreboardOnly is true, then
	// only requirements which should be displayed on the scoreboard will be returned. The next start key is returned
	// as well.
	ListRequirements(cohort DojoCohort, scoreboardOnly bool, startKey string) ([]*Requirement, string, error)

	// ScanRequirements fetches a list of requirements matching the provided cohort, if provided, and a list
	// of all requirements if not provided.
	ScanRequirements(cohort DojoCohort, startKey string) ([]*Requirement, string, error)
}

type RequirementGetter interface {
	// GetRequirement returns the requirement with the provided id.
	GetRequirement(id string) (*Requirement, error)
}

type RequirementSetter interface {
	UserGetter

	// SetRequirement saves the provided requirement in the database.
	SetRequirement(requirement *Requirement) error
}

type RequirementScanner interface {
	UserGetter

	// ScanRequirements fetches a list of requirements matching the provided cohort, if provided, and a list
	// of all requirements if not provided.
	ScanRequirements(cohort DojoCohort, startKey string) ([]*Requirement, string, error)
}

// fetchScoreboardRequirements returns a list of requirements matching the provided cohort that should be displayed
// on the scoreboard. The next startKey is returned as well.
func (repo *dynamoRepository) fetchScoreboardRequirements(cohort DojoCohort, startKey string) ([]*Requirement, string, error) {
	// We use a query here since only the ACTIVE requirements should be displayed on the scoreboard.
	input := &dynamodb.QueryInput{
		KeyConditionExpression: aws.String("#status = :active"),
		ExpressionAttributeNames: map[string]*string{
			"#status":  aws.String("status"),
			"#display": aws.String("scoreboardDisplay"),
			"#counts":  aws.String("counts"),
			"#cohort":  aws.String(string(cohort)),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":active": {S: aws.String(string(Active))},
			":hidden": {S: aws.String(string(Hidden))},
		},
		FilterExpression: aws.String("#display <> :hidden AND attribute_exists(#counts.#cohort)"),
		TableName:        aws.String(requirementTable),
	}

	var requirements []*Requirement
	lastKey, err := repo.query(input, startKey, &requirements)
	if err != nil {
		return nil, "", err
	}
	return requirements, lastKey, nil
}

// ScanRequirements returns a list of requirements matching the provided cohort. Archived requirements and requirements
// hidden from the scoreboard are returned.
func (repo *dynamoRepository) ScanRequirements(cohort DojoCohort, startKey string) ([]*Requirement, string, error) {
	input := &dynamodb.ScanInput{
		TableName: aws.String(requirementTable),
	}

	if cohort != "" {
		input.SetExpressionAttributeNames(map[string]*string{
			"#counts": aws.String("counts"),
			"#cohort": aws.String(string(cohort)),
		})
		input.SetFilterExpression("attribute_exists(#counts.#cohort)")
	}

	var requirements []*Requirement
	lastKey, err := repo.scan(input, startKey, &requirements)
	if err != nil {
		return nil, "", err
	}
	return requirements, lastKey, nil
}

// ListRequirements fetches a list of requirements matching the provided cohort. If scoreboardOnly is true, then
// only requirements which should be displayed on the scoreboard will be returned. The next start key is returned
// as well.
func (repo *dynamoRepository) ListRequirements(cohort DojoCohort, scoreboardOnly bool, startKey string) ([]*Requirement, string, error) {
	if scoreboardOnly {
		return repo.fetchScoreboardRequirements(cohort, startKey)
	}
	return repo.ScanRequirements(cohort, startKey)
}

// GetRequirement returns the requirement with the provided id.
func (repo *dynamoRepository) GetRequirement(id string) (*Requirement, error) {
	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"status": {
				S: aws.String(string(Active)),
			},
			"id": {
				S: aws.String(id),
			},
		},
		TableName: aws.String(requirementTable),
	}

	requirement := Requirement{}
	if err := repo.getItem(input, &requirement); err != nil {
		return nil, err
	}
	return &requirement, nil
}

// IsDeletedRequirement returns true if the given id is the id of a deleted requirement.
func IsDeletedRequirement(id string) bool {
	for _, req := range deletedRequirements {
		if id == req {
			return true
		}
	}
	return false
}

var deletedRequirements = []string{
	"c4457102-d390-415d-ad44-854d2cc66466",
	"4a9300ea-247e-41cb-8457-7a301d4d1bf0",
	"1111ec21-72e0-4452-8f2a-1931b97c3988",
	"4f196ecf-9f3d-415a-9fee-e1e062117d75",
	"9d4e6524-2d50-4a4c-b383-0dab58d91875",
	"ffae41d9-f2af-4725-b67f-9ecdd23537d0",
	"5a93136f-226c-4ec9-a8fa-ed3895569a9e",
	"4cf79c1e-4d0e-4dd3-93db-8c8a0b08f916",
	"ebb7ccdd-6829-41ff-be1d-ebd4b23bbed1",
	"c1ec6ea2-ac2d-4efb-b66e-bbbd3de104d7",
	"64d36d05-d5cd-4c07-9e01-061b03172ba3",
	"df881e1d-c963-4017-a9e9-039a01de3995",
	"4960230c-25ca-4709-9c4e-7f54f6838fb7",
	"ed0790f6-e23c-4248-85d7-9fb319a56185",
	"bf080fe1-8f93-40cc-8719-7fcd7f19a087",
	"54c79e7e-a268-4374-a5aa-aad17bdb668e",
	"fe6cadb5-699d-4349-8244-f3e1193cf7b9",
	"30ca7f54-b799-4e70-b46b-57e40b467b7a",
	"b2115163-c4d5-487e-bd67-3aa79b3acf90",
	"76f48895-396b-4ebc-9b73-a96a3fb78151",
	"07b996bd-f72a-482b-8f44-dcd9443fc53e",
	"d1f743f7-b6d9-4ba7-a94b-5065ddf91b12",
	"1c45c7d6-9431-4bcd-a74a-e3db2e7306b0",
	"010d677f-64db-4eb0-b773-d91b20dd5acc",
	"35705ad5-0cb2-46af-8516-539842c10c8c",
	"96d26db7-2c02-4a2d-9f97-fe867dbcf061",
	"f827da04-dce5-4def-a1db-9131693befb8",
	"a9b7efac-2c4c-4439-8cf1-44edc1fff6ab",
	"dbf1f938-5818-4f74-90c7-34ce42085b0c",
}
