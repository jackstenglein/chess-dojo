package database

import (
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

type Graduation struct {
	// The Cognito username of the graduating user.
	// The hash key of the table.
	Username string `dynamodbav:"username" json:"username"`

	// The display name of the graduating user.
	DisplayName string `dynamodbav:"displayName" json:"displayName"`

	// Set to the hardcoded value `GRADUATION`. Used as the primary key on an index for querying by date.
	Type string `dynamodbav:"type" json:"type"`

	// The cohort the user is graduating from.
	// The range key of the table.
	PreviousCohort DojoCohort `dynamodbav:"previousCohort" json:"previousCohort"`

	// The cohort the user is entering.
	NewCohort DojoCohort `dynamodbav:"newCohort" json:"newCohort"`

	// The user's cohort score at the time of graduation.
	Score float32 `dynamodbav:"score" json:"score"`

	// The user's preferred rating system at the time of graduation.
	RatingSystem RatingSystem `dynamodbav:"ratingSystem" json:"ratingSystem"`

	// The rating the user started with.
	StartRating int `dynamodbav:"startRating" json:"startRating"`

	// The user's rating at the time of graduation.
	CurrentRating int `dynamodbav:"currentRating" json:"currentRating"`

	// The user's comments on graduating.
	Comments string `dynamodbav:"comments" json:"comments"`

	// The user's progress at the time of graduation.
	Progress map[string]*RequirementProgress `dynamodbav:"progress" json:"progress"`

	// The number of times the user has graduated, including this graduation.
	NumberOfGraduations int `dynamodbav:"numberOfGraduations" json:"numberOfGraduations"`

	// The cohorts the user has graduated from
	GraduationCohorts []DojoCohort `dynamodbav:"graduationCohorts" json:"graduationCohorts"`

	// The time the user started the cohort.
	StartedAt string `dynamodbav:"startedAt" json:"startedAt"`

	// The time that the user graduated.
	CreatedAt string `dynamodbav:"createdAt" json:"createdAt"`

	// The amount of time spent in minutes on dojo tasks in the cohort
	DojoMinutes int `dynamodbav:"dojoMinutes,omitempty" json:"dojoMinutes,omitempty"`

	// The amount of time spent in minutes on non-dojo tasks in the cohort
	NonDojoMinutes int `dynamodbav:"nonDojoMinutes,omitempty" json:"nonDojoMinutes,omitempty"`

	// The number of games annotated and published in the 2 months before graduation.
	GamesAnnotated int `dynamodbav:"gamesAnnotated" json:"gamesAnnotated"`

	// A map from a rating system to a slice of RatingHistory objects for that rating system.
	RatingHistories map[RatingSystem][]RatingHistory `dynamodbav:"ratingHistories" json:"ratingHistories"`
}

type GraduationCreator interface {
	UserGetter
	UserUpdater
	RequirementLister
	TimelineEditor
	GameLister

	// PutGraduation saves the provided Graduation in the database.
	PutGraduation(graduation *Graduation) error
}

type GraduationLister interface {
	// ListGraduationsByCohort returns a list of graduations matching the provided cohort.
	ListGraduationsByCohort(cohort DojoCohort, startKey string) ([]Graduation, string, error)

	// ListGraduationsByOwner returns a list of graduations matching the provided username.
	ListGraduationsByOwner(username, startKey string) ([]Graduation, string, error)

	// ListGraduationsByDate returns a list of graduations more recent than the provided date.
	ListGraduationsByDate(date, startKey string) ([]Graduation, string, error)
}

// PutGraduation saves the provided Graduation in the database.
func (repo *dynamoRepository) PutGraduation(graduation *Graduation) error {
	item, err := dynamodbattribute.MarshalMap(graduation)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Unable to marshal graduation", err)
	}

	if len(graduation.Progress) == 0 {
		emptyMap := make(map[string]*dynamodb.AttributeValue)
		item["progress"] = &dynamodb.AttributeValue{M: emptyMap}
	}

	input := &dynamodb.PutItemInput{
		Item:      item,
		TableName: new(graduationTable),
	}
	_, err = repo.svc.PutItem(input)
	return errors.Wrap(500, "Temporary server error", "DynamoDB PutItem failure", err)
}

// ListGraduationsByCohort returns a list of graduations matching the provided cohort.
func (repo *dynamoRepository) ListGraduationsByCohort(cohort DojoCohort, startKey string) ([]Graduation, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: new("#previousCohort = :cohort"),
		ExpressionAttributeNames: map[string]*string{
			"#previousCohort": new("previousCohort"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":cohort": {S: new(string(cohort))},
		},
		IndexName: new(graduationTableCohortIndex),
		TableName: new(graduationTable),
	}

	var graduations []Graduation
	lastKey, err := repo.query(input, startKey, &graduations)
	if err != nil {
		return nil, "", err
	}
	return graduations, lastKey, nil
}

// ListGraduationsByOwner returns a list of graduations matching the provided username.
func (repo *dynamoRepository) ListGraduationsByOwner(username, startKey string) ([]Graduation, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: new("#username = :username"),
		ExpressionAttributeNames: map[string]*string{
			"#username": new("username"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":username": {S: new(username)},
		},
		TableName: new(graduationTable),
	}

	var graduations []Graduation
	lastKey, err := repo.query(input, startKey, &graduations)
	if err != nil {
		return nil, "", err
	}
	return graduations, lastKey, nil
}

// ListGraduationsByDate returns a list of graduations more recent than the provided date.
func (repo *dynamoRepository) ListGraduationsByDate(date, startKey string) ([]Graduation, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: new("#type = :type AND #date >= :date"),
		ExpressionAttributeNames: map[string]*string{
			"#type": new("type"),
			"#date": new("createdAt"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":type": {S: new("GRADUATION")},
			":date": {S: new(date)},
		},
		IndexName: new("DateIndex"),
		TableName: new(graduationTable),
	}

	var graduations []Graduation
	lastKey, err := repo.query(input, startKey, &graduations)
	if err != nil {
		return nil, "", err
	}
	return graduations, lastKey, nil
}

// ScanGraduations returns a list of all graduations in the table, paginated by the startKey.
func (repo *dynamoRepository) ScanGraduations(startKey string) ([]Graduation, string, error) {
	input := &dynamodb.ScanInput{
		TableName: new(graduationTable),
	}

	var graduations []Graduation
	lastKey, err := repo.scan(input, startKey, &graduations)
	if err != nil {
		return nil, "", err
	}
	return graduations, lastKey, nil
}
