package database

import (
	"fmt"

	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/aws/aws-sdk-go/service/dynamodb/expression"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
)

type EventStatistics struct {
	// The total number of Events created by EventType
	Created map[EventType]int `dynamodbav:"types" json:"types"`

	// The total number of requests to book an availability.
	AvailabilitiesBooked int `dynamodbav:"availabilitiesBooked" json:"availabilitiesBooked"`

	// The total number of availabilities that have been deleted.
	AvailabilitiesDeleted int `dynamodbav:"availabilitiesDeleted" json:"availabilitiesDeleted"`

	// The total number of cancelations that have happened on an availability.
	AvailabilitiesCanceled int `dynamodbav:"availabilitiesCanceled" json:"availabilitiesCanceled"`

	// The number of availabilities that have been created by owner cohort.
	OwnerCohorts map[string]int `dynamodbav:"ownerCohorts" json:"ownerCohorts"`

	// The number of availabilities that are bookable by the given cohort.
	BookableCohorts map[string]int `dynamodbav:"bookableCohorts" json:"bookableCohorts"`

	// The number of availabilities created that offer the given type
	AvailabilityTypes map[AvailabilityType]int `dynamodbav:"availabilityTypes" json:"availabilityTypes"`

	// The number of availabilities created with a given value for MaxParticipants
	AvailabilityMaxParticipants map[int]int `dynamodbav:"availabilityMaxParticipants" json:"availabilityMaxParticipants"`
}

type CohortStatistics struct {
	// The number of active participants in the cohort
	ActiveParticipants int `dynamodbav:"activeParticipants" json:"activeParticipants"`

	// The number of inactive participants in the cohort
	InactiveParticipants int `dynamodbav:"inactiveParticipants" json:"inactiveParticipants"`

	// The number of free participants in the cohort
	FreeActiveParticipants int `dynamodbav:"freeActiveParticipants" json:"freeActiveParticipants"`

	// The number of free inactive participants in the cohort
	FreeInactiveParticipants int `dynamodbav:"freeInactiveParticipants" json:"freeInactiveParticipants"`

	// The number of conversions from free tier to subscribed in the cohort
	FreeTierConversions int `dynamodbav:"freeTierConversions" json:"freeTierConversions"`

	// The number of conversions from subscribed to free tier in the cohort
	SubscriptionCancelations int `dynamodbav:"subscriptionCancelations" json:"subscriptionCancelations"`

	// The sum of active dojo scores in the cohort
	ActiveDojoScores float32 `dynamodbav:"activeDojoScores" json:"activeDojoScores"`

	// The sum of inactive dojo scores in the cohort
	InactiveDojoScores float32 `dynamodbav:"inactiveDojoScores" json:"inactiveDojoScores"`

	// The sum of active rating changes in the cohort
	ActiveRatingChanges int `dynamodbav:"activeRatingChanges" json:"activeRatingChanges"`

	// The sum of inactive rating changes in the cohort
	InactiveRatingChanges int `dynamodbav:"inactiveRatingChanges" json:"inactiveRatingChanges"`

	// The number of active users with a specific rating system in the cohort
	ActiveRatingSystems map[RatingSystem]int `dynamodbav:"activeRatingSystems" json:"activeRatingSystems"`

	// The number of inactive users with a specific rating system in the cohort
	InactiveRatingSystems map[RatingSystem]int `dynamodbav:"inactiveRatingSystems" json:"inactiveRatingSystems"`

	// The sum of active minutes spent in the cohort
	ActiveMinutesSpent int `dynamodbav:"activeMinutesSpent" json:"activeMinutesSpent"`

	// The sum of inactive minutes spent in the cohort
	InactiveMinutesSpent int `dynamodbav:"inactiveMinutesSpent" json:"inactiveMinutesSpent"`

	// The sum of rating change per hour spent for active users in the cohort
	ActiveRatingChangePerHour float32 `dynamodbav:"activeRatingChangePerHour" json:"activeRatingChangePerHour"`

	// The sum of rating change per hour spent for inactive users in the cohort
	InactiveRatingChangePerHour float32 `dynamodbav:"inactiveRatingChangePerHour" json:"inactiveRatingChangePerHour"`

	// The number of graduations from the cohort
	NumGraduations int `dynamodbav:"numGraduations" json:"numGraduations"`

	// The sum of minutes taken to graduate from the cohort
	GraduationMinutes int `dynamodbav:"graduationMinutes" json:"graduationMinutes"`

	// The average rating change per dojo point in the cohort
	AvgRatingChangePerDojoPoint float32 `dynamodbav:"avgRatingChangePerDojoPoint" json:"avgRatingChangePerDojoPoint"`
}

type UserStatistics struct {
	Cohorts map[DojoCohort]*CohortStatistics `dynamodbav:"cohorts" json:"cohorts"`
}

type AdminStatisticsGetter interface {
	UserGetter

	// GetEventStatistics gets the event statistics from the database.
	GetEventStatistics() (*EventStatistics, error)
}

type UserStatisticsGetter interface {
	// GetUserStatistics returns the user statistics from the database.
	GetUserStatistics() (*UserStatistics, error)
}

// NewUserStatistics returns a blank UserStatistics object with all values
// set to zero.
func NewUserStatistics() *UserStatistics {
	stats := &UserStatistics{
		Cohorts: make(map[DojoCohort]*CohortStatistics),
	}

	for _, c := range Cohorts {
		stats.Cohorts[c] = &CohortStatistics{
			ActiveRatingSystems:   make(map[RatingSystem]int),
			InactiveRatingSystems: make(map[RatingSystem]int),
		}

		for _, rs := range ratingSystems {
			stats.Cohorts[c].ActiveRatingSystems[rs] = 0
			stats.Cohorts[c].InactiveRatingSystems[rs] = 0
		}
	}

	return stats
}

// GetUserStatistics returns the user statistics from the database.
func (repo *dynamoRepository) GetUserStatistics() (*UserStatistics, error) {
	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"username": {
				S: new("STATISTICS"),
			},
		},
		TableName: new(userTable),
	}

	userStats := UserStatistics{}
	if err := repo.getItem(input, &userStats); err != nil {
		return nil, err
	}
	return &userStats, nil
}

// SetUserStatistics inserts the provided user statistics into the database.
func (repo *dynamoRepository) SetUserStatistics(stats *UserStatistics) error {
	log.Debugf("Saving stats: %#v", stats)
	item, err := dynamodbattribute.MarshalMap(stats)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Unable to marshal users stats", err)
	}
	item["username"] = &dynamodb.AttributeValue{S: new("STATISTICS")}
	item["dojoCohort"] = &dynamodb.AttributeValue{S: new("STATISTICS")}

	input := &dynamodb.PutItemInput{
		Item:      item,
		TableName: new(userTable),
	}
	_, err = repo.svc.PutItem(input)
	return errors.Wrap(500, "Temporary server error", "DynamoDB PutItem failure", err)
}

// GetEventStatistics gets the event statistics from the
func (repo *dynamoRepository) GetEventStatistics() (*EventStatistics, error) {
	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: new("STATISTICS"),
			},
		},
		TableName: new(eventTable),
	}

	eventStats := EventStatistics{}
	if err := repo.getItem(input, &eventStats); err != nil {
		return nil, err
	}
	return &eventStats, nil
}

// RecordEventCreation saves statistics on the created event.
func (repo *dynamoRepository) RecordEventCreation(event *Event) error {
	builder := expression.UpdateBuilder{}

	if event.Type == EventType_Dojo {
		value := expression.Name("created.DOJO").Plus(expression.Value(1))
		builder = builder.Set(expression.Name("created.DOJO"), value)
	} else {
		value := expression.Name("created.AVAILABILITY").Plus(expression.Value(1))
		builder = builder.Set(expression.Name("created.AVAILABILITY"), value)

		ownerCohortName := fmt.Sprintf("ownerCohorts.%s", event.OwnerCohort)
		value = expression.Name(ownerCohortName).Plus(expression.Value(1))
		builder = builder.Set(expression.Name(ownerCohortName), value)

		for _, c := range event.Cohorts {
			bookableCohortName := fmt.Sprintf("bookableCohorts.%s", c)
			value = expression.Name(bookableCohortName).Plus(expression.Value(1))
			builder = builder.Set(expression.Name(bookableCohortName), value)
		}

		for _, t := range event.Types {
			typeName := fmt.Sprintf("availabilityTypes.%s", t)
			value = expression.Name(typeName).Plus(expression.Value(1))
			builder = builder.Set(expression.Name(typeName), value)
		}

		maxParticipantsName := fmt.Sprintf("availabilityMaxParticipants.%d", event.MaxParticipants)
		value = expression.Name(maxParticipantsName).Plus(expression.Value(1))
		builder = builder.Set(expression.Name(maxParticipantsName), value)
	}

	expr, err := expression.NewBuilder().WithUpdate(builder).Build()
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to build DynamoDB expression", err)
	}

	input := &dynamodb.UpdateItemInput{
		UpdateExpression:          expr.Update(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: new("STATISTICS"),
			},
		},
		TableName: new(eventTable),
	}

	_, err = repo.svc.UpdateItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed to update event statistics record", err)
}

// RecordEventBooking saves statistics on an event booking.
func (repo *dynamoRepository) RecordEventBooking(event *Event) error {
	if event.Type == EventType_Dojo {
		return nil
	}

	updateExpression := "SET availabilitiesBooked = availabilitiesBooked + :v"

	input := &dynamodb.UpdateItemInput{
		UpdateExpression: new(updateExpression),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":v": {
				N: new("1"),
			},
		},
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: new("STATISTICS"),
			},
		},
		TableName: new(eventTable),
	}

	_, err := repo.svc.UpdateItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed to update event statistics record", err)
}

// RecordEventDeletion saves statistics on the deleted event.
func (repo *dynamoRepository) RecordEventDeletion(event *Event) error {
	if event.Type == EventType_Dojo {
		return nil
	}

	input := &dynamodb.UpdateItemInput{
		UpdateExpression: new("SET availabilitiesDeleted = availabilitiesDeleted + :v"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":v": {
				N: new("1"),
			},
		},
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: new("STATISTICS"),
			},
		},
		TableName: new(eventTable),
	}

	_, err := repo.svc.UpdateItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed to update event statistics record", err)
}

// RecordEventCancelation saves statistics on the canceled event.
func (repo *dynamoRepository) RecordEventCancelation(event *Event) error {
	if event.Type == EventType_Dojo {
		return nil
	}

	input := &dynamodb.UpdateItemInput{
		UpdateExpression: new("SET availabilitiesCanceled = availabilitiesCanceled + :v"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":v": {
				N: new("1"),
			},
		},
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: new("STATISTICS"),
			},
		},
		TableName: new(eventTable),
	}
	_, err := repo.svc.UpdateItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed to update event statistics record", err)
}

// RecordSubscriptionCancelation adds 1 cancelation to the user statistics for
// the given cohort.
func (repo *dynamoRepository) RecordSubscriptionCancelation(cohort DojoCohort) error {
	input := &dynamodb.UpdateItemInput{
		UpdateExpression: new("ADD #cohorts.#c.#cancelations :q"),
		ExpressionAttributeNames: map[string]*string{
			"#cohorts":      new("cohorts"),
			"#c":            new(string(cohort)),
			"#cancelations": new("subscriptionCancelations"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":q": {N: new("1")},
		},
		Key: map[string]*dynamodb.AttributeValue{
			"username": {S: new("STATISTICS")},
		},
		TableName: new(userTable),
	}
	_, err := repo.svc.UpdateItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed to update user statistics record", err)
}

// RecordFreeTierConversion adds 1 conversion to the user statistics for
// the given cohort.
func (repo *dynamoRepository) RecordFreeTierConversion(cohort DojoCohort) error {
	input := &dynamodb.UpdateItemInput{
		UpdateExpression: new("ADD #cohorts.#c.#conversions :q"),
		ExpressionAttributeNames: map[string]*string{
			"#cohorts":     new("cohorts"),
			"#c":           new(string(cohort)),
			"#conversions": new("freeTierConversions"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":q": {N: new("1")},
		},
		Key: map[string]*dynamodb.AttributeValue{
			"username": {S: new("STATISTICS")},
		},
		TableName: new(userTable),
	}
	_, err := repo.svc.UpdateItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed to update user statistics record", err)
}
