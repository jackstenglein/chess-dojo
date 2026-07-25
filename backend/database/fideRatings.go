package database

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

var fideRatingsTable = stage + "-fide-ratings"

// FideRating is one row of the monthly FIDE rating list import.
type FideRating struct {
	// The player's FIDE ID.
	Id string `dynamodbav:"id" json:"id"`

	// The player's standard rating. 0 if the player has no standard rating.
	Rating int `dynamodbav:"rating" json:"rating"`

	// TTL attribute. DynamoDB deletes rows not refreshed by a later import.
	ExpiresAt int64 `dynamodbav:"expiresAt" json:"expiresAt"`
}

// GetFideRating returns the rating for the given FIDE ID from the monthly
// rating list import. IDs absent from the list return a 404 error.
func (repo *dynamoRepository) GetFideRating(fideId string) (*Rating, error) {
	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"id": {S: aws.String(fideId)},
		},
		TableName: aws.String(fideRatingsTable),
	}
	result, err := repo.svc.GetItem(input)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB GetItem failure", err)
	}
	if result.Item == nil {
		return nil, errors.New(404, "Invalid request: FIDE ID not found in rating list", fmt.Sprintf("FIDE ID %q not in table", fideId))
	}

	item := FideRating{}
	if err := dynamodbattribute.UnmarshalMap(result.Item, &item); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal FideRating", err)
	}
	return fideRatingToRating(&item, time.Now())
}

// fideRatingToRating rejects expired rows: DynamoDB TTL deletion is
// asynchronous, so expired items can still be returned by GetItem.
func fideRatingToRating(item *FideRating, now time.Time) (*Rating, error) {
	if item.ExpiresAt <= now.Unix() {
		return nil, errors.New(404, "Invalid request: FIDE ID not found in rating list", fmt.Sprintf("FIDE ID %q expired at %d", item.Id, item.ExpiresAt))
	}
	return &Rating{CurrentRating: item.Rating}, nil
}
