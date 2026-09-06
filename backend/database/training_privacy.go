package database

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

func (repo *dynamoRepository) GetTrainingPrivacyUser(username string) (*User, error) {
	user := &User{}
	err := repo.getItem(&dynamodb.GetItemInput{
		TableName: aws.String(userTable), ConsistentRead: aws.Bool(true),
		Key:                  map[string]*dynamodb.AttributeValue{"username": {S: aws.String(username)}},
		ProjectionExpression: aws.String("username, trainingVisibility, isAdmin, subscriptionStatus"),
	}, user)
	return user, err
}

func (repo *dynamoRepository) GetTrainingPrivacyFollower(poster, follower string) (*FollowerEntry, error) {
	entry := &FollowerEntry{}
	err := repo.getItem(&dynamodb.GetItemInput{
		TableName: aws.String(followersTable), ConsistentRead: aws.Bool(true),
		Key: map[string]*dynamodb.AttributeValue{"poster": {S: aws.String(poster)}, "follower": {S: aws.String(follower)}},
	}, entry)
	var apiErr *errors.Error
	if errors.As(err, &apiErr) && apiErr.Code == 404 {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return entry, nil
}

// GetTrainingPrivacyUsers reads current policy from the base table in DynamoDB-sized batches.
func (repo *dynamoRepository) GetTrainingPrivacyUsers(usernames []string) ([]*User, error) {
	users := make([]*User, 0, len(usernames))
	for start := 0; start < len(usernames); start += 100 {
		end := min(start+100, len(usernames))
		keys := make([]map[string]*dynamodb.AttributeValue, 0, end-start)
		for _, username := range usernames[start:end] {
			keys = append(keys, map[string]*dynamodb.AttributeValue{"username": {S: aws.String(username)}})
		}
		result, err := repo.svc.BatchGetItem(&dynamodb.BatchGetItemInput{RequestItems: map[string]*dynamodb.KeysAndAttributes{
			userTable: {Keys: keys, ConsistentRead: aws.Bool(true), ProjectionExpression: aws.String("username, trainingVisibility, isAdmin, subscriptionStatus")},
		}})
		if err != nil {
			return nil, errors.Wrap(500, "Unable to check training visibility", "BatchGetItem failed", err)
		}
		// A throttled/partial policy response must not default omitted users to Public.
		if len(result.UnprocessedKeys) != 0 {
			return nil, errors.New(503, "Unable to check training visibility. Please try again.", "Unprocessed policy keys")
		}
		var batch []*User
		if err := dynamodbattribute.UnmarshalListOfMaps(result.Responses[userTable], &batch); err != nil {
			return nil, err
		}
		users = append(users, batch...)
	}
	return users, nil
}
