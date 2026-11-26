package database

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/aws/aws-sdk-go/service/sqs"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

// dynamoRepository implements a database using AWS DynamoDB.
type dynamoRepository struct {
	svc *dynamodb.DynamoDB
}

var sess = session.Must(session.NewSession())

// DynamoDB implements a database using AWS DynamoDB.
var DynamoDB = &dynamoRepository{
	svc: dynamodb.New(sess),
}

var sqsService = sqs.New(sess)
var sqsUrl = os.Getenv("notificationEventSqsUrl")

var stage = os.Getenv("stage")
var userTable = stage + "-users"
var timelineTable = stage + "-timeline"
var gameTable = stage + "-games"
var requirementTable = stage + "-requirements"
var graduationTable = stage + "-graduations"
var eventTable = stage + "-events"
var courseTable = stage + "-courses"
var tournamentTable = stage + "-tournaments"
var notificationTable = stage + "-notifications"
var followersTable = stage + "-followers"
var newsfeedTable = stage + "-newsfeed"
var yearReviewTable = stage + "-yearReviews"
var clubTable = stage + "-clubs"
var examsTable = stage + "-exams"
var directoryTable = stage + "-directories"
var liveClassesTable = stage + "-live-classes"

const gameTableOwnerIndex = "OwnerIdx"
const gameTableWhiteIndex = "WhiteIndex"
const gameTableBlackIndex = "BlackIndex"
const gameTableFeaturedIndex = "FeaturedIndex"
const gameTableReviewIndex = "ReviewIndex"

const tournamentTableOpenClassicalIndex = "OpenClassicalIndex"

const graduationTableCohortIndex = "CohortIndex"

// getItem handles sending a DynamoDB GetItem request and unmarshals the result into the provided output
// value, which must be a non-nil pointer. If the result of the GetItem request is nil, then
// a 404 error is returned. All other errors result in a 500 error.
func (repo *dynamoRepository) getItem(input *dynamodb.GetItemInput, out any) error {
	result, err := repo.svc.GetItem(input)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "DynamoDB GetItem failure", err)
	}

	if result.Item == nil {
		return errors.New(404, "Invalid request: resource not found", fmt.Sprintf("DynamoDB GetItem result.Item is nil for input %+v", input))
	}

	err = dynamodbattribute.UnmarshalMap(result.Item, out)
	return errors.Wrap(500, "Temporary server error", "Failed to unmarshal DynamoDB GetItem result", err)
}

// query handles sending a DynamoDB Query request and unmarshals the result into the provided output value,
// which must be a non-nil pointer to a slice. startKey is an optional parameter that can be used to perform
// pagination. The next startKey is returned. If startKey cannot be unmarshalled, a 400 error is returned.
// All other errors result in a 500.
func (repo *dynamoRepository) query(input *dynamodb.QueryInput, startKey string, out any) (string, error) {
	if startKey != "" {
		var exclusiveStartKey map[string]*dynamodb.AttributeValue
		err := json.Unmarshal([]byte(startKey), &exclusiveStartKey)
		if err != nil {
			return "", errors.Wrap(400, "Invalid request: startKey is not valid", "startKey could not be unmarshaled from json", err)
		}
		input.SetExclusiveStartKey(exclusiveStartKey)
	}

	result, err := repo.svc.Query(input)
	if err != nil {
		return "", errors.Wrap(500, "Temporary server error", "DynamoDB Query failure", err)
	}

	if err := dynamodbattribute.UnmarshalListOfMaps(result.Items, out); err != nil {
		return "", errors.Wrap(500, "Temporary server error", "Failed to unmarshal Query result", err)
	}

	var lastKey string
	if len(result.LastEvaluatedKey) > 0 {
		b, err := json.Marshal(result.LastEvaluatedKey)
		if err != nil {
			return "", errors.Wrap(500, "Temporary server error", "Failed to marshal Query LastEvaluatedKey", err)
		}
		lastKey = string(b)
	}
	return lastKey, nil
}

// scan handles sending a DynamoDB Scan request and unmarshals the result into the provided output value, which
// must be a non-nil pointer to a slice. startKey is an optional parameter that can be used to perform pagination.
// The next startKey is returned. If startKey cannot be unmarshalled, a 400 error is returned. All other errors
// result in a 500.
func (repo *dynamoRepository) scan(input *dynamodb.ScanInput, startKey string, out any) (string, error) {
	if startKey != "" {
		var exclusiveStartKey map[string]*dynamodb.AttributeValue
		err := json.Unmarshal([]byte(startKey), &exclusiveStartKey)
		if err != nil {
			return "", errors.Wrap(400, "Invalid request: startKey is not valid", "startKey could not be unmarshaled from json", err)
		}
		input.SetExclusiveStartKey(exclusiveStartKey)
	}

	result, err := repo.svc.Scan(input)
	if err != nil {
		return "", errors.Wrap(500, "Temporary server error", "DynamoDB Scan failure", err)
	}

	if err := dynamodbattribute.UnmarshalListOfMaps(result.Items, out); err != nil {
		return "", errors.Wrap(500, "Temporary server error", "Failed to unmarshal Scan result", err)
	}

	var lastKey string
	if len(result.LastEvaluatedKey) > 0 {
		b, err := json.Marshal(result.LastEvaluatedKey)
		if err != nil {
			return "", errors.Wrap(500, "Temporary server error", "Failed to marshal Scan LastEvaluatedKey", err)
		}
		lastKey = string(b)
	}
	return lastKey, nil
}

// batchWriteObjects inserts the provided objects into the provided table. The number of successfully inserted
// objects is returned.
func batchWriteObjects[T any](repo *dynamoRepository, objects []T, tableName string, opts ...func(object T, item map[string]*dynamodb.AttributeValue)) (int, error) {
	var putRequests []*dynamodb.WriteRequest
	updated := 0

	for _, e := range objects {
		item, err := dynamodbattribute.MarshalMap(e)
		if err != nil {
			return updated, errors.Wrap(500, "Temporary server error", "Unable to marshal timeline entry", err)
		}

		for _, opt := range opts {
			opt(e, item)
		}

		req := &dynamodb.WriteRequest{
			PutRequest: &dynamodb.PutRequest{
				Item: item,
			},
		}
		putRequests = append(putRequests, req)

		if len(putRequests) == 25 {
			if err := repo.batchWrite(putRequests, tableName); err != nil {
				return updated, err
			}
			updated += 25
			putRequests = nil
		}
	}

	if len(putRequests) > 0 {
		if err := repo.batchWrite(putRequests, tableName); err != nil {
			return updated, err
		}
		updated += len(putRequests)
	}

	return updated, nil
}

// batchWrite handles sending a DynamoDB BatchWriteItem request using the provided slice of WriteRequests.
// The WriteRequests are mapped to the provided table name.
func (repo *dynamoRepository) batchWrite(reqs []*dynamodb.WriteRequest, tableName string) error {
	input := &dynamodb.BatchWriteItemInput{
		RequestItems: map[string][]*dynamodb.WriteRequest{
			tableName: reqs,
		},
		ReturnConsumedCapacity: new("NONE"),
	}

	output, err := repo.svc.BatchWriteItem(input)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed DynamoDB BatchWriteItem", err)
	}
	if len(output.UnprocessedItems) > 0 {
		return errors.New(500, "Temporary server error", fmt.Sprintf("DynamoDB BatchWriteItem failed to process (%+v): %+v", reqs, output))
	}
	return nil
}

// handles sending a DynamoDB UpdateItem request using the provided input. The result is unmarshaled
// into the provided output value, which must be a non-nil pointer.
func (repo *dynamoRepository) updateItem(input *dynamodb.UpdateItemInput, out any) error {
	result, err := repo.svc.UpdateItem(input)
	if err != nil {
		return err
	}
	return dynamodbattribute.UnmarshalMap(result.Attributes, out)
}
