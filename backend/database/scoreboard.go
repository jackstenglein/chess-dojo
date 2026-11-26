package database

import (
	"time"

	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

// ScoreboardSummary represents a single row of data in the summary scoreboards
// (IE: full dojo and follower scorbeoards).
type ScoreboardSummary struct {
	// The user's Cognito username. Uniquely identifies a user.
	Username string `dynamodbav:"username" json:"username"`

	// The user's preferred display name on the site.
	DisplayName string `dynamodbav:"displayName" json:"displayName"`

	// The cohorts the user has graduated from.
	GraduationCohorts []DojoCohort `dynamodbav:"graduationCohorts" json:"graduationCohorts"`

	// The user's preferred rating system.
	RatingSystem RatingSystem `dynamodbav:"ratingSystem" json:"ratingSystem"`

	// The user's ratings in each rating system.
	Ratings map[RatingSystem]*Rating `dynamodbav:"ratings" json:"ratings"`

	// The user's Dojo cohort.
	DojoCohort DojoCohort `dynamodbav:"dojoCohort" json:"dojoCohort"`

	// The user's total dojo score, across all cohorts.
	TotalDojoScore float32 `dynamodbav:"totalDojoScore" json:"totalDojoScore"`

	// A map from a time period to the number of minutes the user has spent on
	// tasks in that time period.
	MinutesSpent map[string]int `dynamodbav:"minutesSpent" json:"minutesSpent"`
}

type ScoreboardSummaryLister interface {
	// Allows fetching who a user follows for GetSummariesByUsername.
	FollowerLister

	// ListScoreboardSummaries returns a list of ScoreboardSummaries for all active users in the SUBSCRIBED tier.
	// Up to 1MB of data is included at a time. startKey is an optional parameter users to perform pagination.
	ListScoreboardSummaries(startKey string) ([]ScoreboardSummary, string, error)

	// GetScoreboardSummaries returns a list of ScoreboardSummaries matching the provided usernames.
	// Up to 100 usernames can be specified at a time.
	GetScoreboardSummaries(usernames []string) ([]ScoreboardSummary, error)

	// GetCohort returns a list of Users in the provided cohort, up to 1MB of data.
	// startKey is an optional parameter that can be used to perform pagination. Free-tier and inactive
	// users are excluded. The list of users and the next start key are returned.
	GetCohort(cohort, startKey string) ([]User, string, error)
}

// ListScoreboardSummaries returns a list of ScoreboardSummaries for all active users in the SUBSCRIBED tier.
// Up to 1MB of data is included at a time. startKey is an optional parameter users to perform pagination.
func (repo *dynamoRepository) ListScoreboardSummaries(startKey string) ([]ScoreboardSummary, string, error) {
	monthAgo := time.Now().Add(ONE_MONTH_AGO).Format(time.RFC3339)

	input := &dynamodb.QueryInput{
		KeyConditionExpression: new("#status = :subscribed"),
		FilterExpression:       new("#u >= :u AND #cohort <> :none"),
		ExpressionAttributeNames: map[string]*string{
			"#status": new("subscriptionStatus"),
			"#u":      new("updatedAt"),
			"#cohort": new("dojoCohort"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":subscribed": {S: new(string(SubscriptionStatus_Subscribed))},
			":u":          {S: new(monthAgo)},
			":none":       {S: new(string(NoCohort))},
		},
		IndexName: new("ScoreboardSummaryIdx"),
		TableName: new(userTable),
	}

	var summaries []ScoreboardSummary
	lastKey, err := repo.query(input, startKey, &summaries)
	if err != nil {
		return nil, "", err
	}
	return summaries, lastKey, nil
}

const scoreboardSummaryProjection = "username, displayName, graduationCohorts, ratingSystem, ratings, dojoCohort, totalDojoScore, minutesSpent"

// GetScoreboardSummaries returns a list of ScoreboardSummaries matching the provided usernames.
// Up to 100 usernames can be specified at a time.
func (repo *dynamoRepository) GetScoreboardSummaries(usernames []string) ([]ScoreboardSummary, error) {
	if len(usernames) == 0 {
		return []ScoreboardSummary{}, nil
	}
	if len(usernames) > 100 {
		return nil, errors.New(500, "Temporary server error", "More than 100 usernames passed to GetScoreboardSummaries")
	}

	input := &dynamodb.BatchGetItemInput{
		RequestItems: map[string]*dynamodb.KeysAndAttributes{
			userTable: {
				Keys:                 []map[string]*dynamodb.AttributeValue{},
				ProjectionExpression: new(scoreboardSummaryProjection),
			},
		},
	}

	for _, u := range usernames {
		key := map[string]*dynamodb.AttributeValue{
			"username": {S: new(u)},
		}
		input.RequestItems[userTable].Keys = append(input.RequestItems[userTable].Keys, key)
	}

	result, err := repo.svc.BatchGetItem(input)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed call to BatchGetItem", err)
	}
	list := result.Responses[userTable]

	var summaries []ScoreboardSummary
	if err := dynamodbattribute.UnmarshalListOfMaps(list, &summaries); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal BatchGetItem result", err)
	}

	return summaries, nil
}

// GetCohort returns a list of Users in the provided cohort, up to 1MB of data.
// startKey is an optional parameter that can be used to perform pagination. Free-tier and inactive
// users are excluded. The list of users and the next start key are returned.
func (repo *dynamoRepository) GetCohort(cohort, startKey string) ([]User, string, error) {
	monthAgo := time.Now().Add(ONE_MONTH_AGO).Format(time.RFC3339)
	input := &dynamodb.QueryInput{
		KeyConditionExpression: new("#cohort = :cohort"),
		FilterExpression:       new("#u >= :u AND #status = :subscribed"),
		ExpressionAttributeNames: map[string]*string{
			"#cohort": new("dojoCohort"),
			"#u":      new("updatedAt"),
			"#status": new("subscriptionStatus"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":cohort":     {S: new(string(cohort))},
			":u":          {S: new(monthAgo)},
			":subscribed": {S: new(string(SubscriptionStatus_Subscribed))},
		},
		IndexName: new("CohortIdx"),
		TableName: new(userTable),
	}

	var users []User
	lastKey, err := repo.query(input, startKey, &users)
	if err != nil {
		return nil, "", err
	}
	return users, lastKey, nil
}
