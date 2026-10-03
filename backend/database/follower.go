package database

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
)

// FollowerEntry represents an entry in the Followers table.
type FollowerEntry struct {
	// The username of the person posting a timeline event.
	Poster string `dynamodbav:"poster" json:"poster"`

	// The display name of the person posting a timeline event.
	PosterDisplayName string `dynamodbav:"posterDisplayName" json:"posterDisplayName"`

	// The username of the person following the poster.
	Follower string `dynamodbav:"follower" json:"follower"`

	// The display name of the person following the poster.
	FollowerDisplayName string `dynamodbav:"followerDisplayName" json:"followerDisplayName"`

	// The datetime when the follower relationship was created.
	CreatedAt string `dynamodbav:"createdAt" json:"createdAt"`
}

// FollowerEditor provides an interface for creating and deleting follower relationships.
type FollowerEditor interface {
	UserGetter

	// CreateFollower adds a FollowerEntry for the given poster and follower. The poster's and follower's
	// followerCount/followingCount fields are also updated.
	CreateFollower(poster, follower *User) (*FollowerEntry, error)

	// DeleteFollower removes a FollowerEntry for the given poster and follower usernames. The poster's and
	// follower's followerCount/followingCount fields are also updated.
	DeleteFollower(poster, follower string) error
}

// FollowerGetter provides an interface for fetching a specific FollowerEntry.
type FollowerGetter interface {
	// GetFollowerEntry returns the FollowerEntry with the provided poster and follower. If the FollowerEntry
	// does not exist, a nil FollowerEntry and nil error is returned.
	GetFollowerEntry(poster, follower string) (*FollowerEntry, error)
}

// FollowerLister provides an interface for listing followers of a specific user.
type FollowerLister interface {
	// ListFollowers returns a list of FollowerEntry objects where the given username is the Poster.
	// The next start key is also returned.
	ListFollowers(username, startKey string) ([]FollowerEntry, string, error)

	// ListFollowing returns a list of FollowerEntry objects where the given username is the Follower.
	// The next start key is also returned. This is equivalent to ListFollowingLimit(username, startKey, -1).
	ListFollowing(username, startKey string) ([]FollowerEntry, string, error)

	// ListFollowingLimit returns a list of FollowerEntry objects where the given username is the Follower.
	// The next start key is also returned. If limit is positive, it is used as the upper bound on the
	// number of results returned. If non-positive, it is ignored.
	ListFollowingLimit(username, startKey string, limit int) ([]FollowerEntry, string, error)
}

// CreateFollower adds a FollowerEntry for the given poster and follower. The poster's and follower's
// followerCount/followingCount fields are also updated.
func (repo *dynamoRepository) CreateFollower(poster, follower *User) (*FollowerEntry, error) {
	followerEntry := &FollowerEntry{
		Poster:              poster.Username,
		PosterDisplayName:   poster.DisplayName,
		Follower:            follower.Username,
		FollowerDisplayName: follower.DisplayName,
		CreatedAt:           time.Now().Format(time.RFC3339),
	}

	item, err := dynamodbattribute.MarshalMap(followerEntry)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Unable to marshal user", err)
	}

	input := &dynamodb.PutItemInput{
		Item:                item,
		ConditionExpression: new("attribute_not_exists(follower)"),
		TableName:           new(followersTable),
	}
	_, err = repo.svc.PutItem(input)
	if err != nil {
		if _, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			// The follower relationship already exists, so we can just return like everything worked successfully
			return followerEntry, nil
		}
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB PutItem call", err)
	}

	if err := repo.updateFollowCount(poster.Username, "followerCount", 1); err != nil {
		log.Error("Failed to update followerCount: ", err)
	}
	if err := repo.updateFollowCount(follower.Username, "followingCount", 1); err != nil {
		log.Error("Failed to update followingCount: ", err)
	}
	return followerEntry, nil
}

// updateFollowCount updates the followerCount or followingCount (as chosen by field) for the given username.
func (repo *dynamoRepository) updateFollowCount(username, field string, incrementalCount int) error {
	if field != "followerCount" && field != "followingCount" {
		return errors.New(500, "Temporary server error", "field is not supported")
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"username": {
				S: new(username),
			},
		},
		UpdateExpression: new("ADD #v :v"),
		ExpressionAttributeNames: map[string]*string{
			"#v": &field,
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":v": {N: new(fmt.Sprintf("%d", incrementalCount))},
		},
		TableName: &userTable,
	}
	_, err := repo.svc.UpdateItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem call", err)
}

// DeleteFollower removes a FollowerEntry for the given poster and follower usernames. The poster's and
// follower's followerCount/followingCount fields are also updated.
func (repo *dynamoRepository) DeleteFollower(poster, follower string) error {
	input := &dynamodb.DeleteItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"poster":   {S: &poster},
			"follower": {S: &follower},
		},
		ConditionExpression: new("attribute_exists(follower)"),
		TableName:           new(followersTable),
	}
	_, err := repo.svc.DeleteItem(input)
	if err != nil {
		if _, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			// The follower relationship does not exist, so we can just return like everything worked successfully
			return nil
		}
		return errors.Wrap(500, "Temporary server error", "Failed DynamoDB DeleteItem call", err)
	}

	if err := repo.updateFollowCount(poster, "followerCount", -1); err != nil {
		log.Error("Failed to update followerCount: ", err)
	}
	if err := repo.updateFollowCount(follower, "followingCount", -1); err != nil {
		log.Error("Failed to update followingCount: ", err)
	}
	return nil
}

// GetFollowerEntry returns the FollowerEntry with the provided poster and follower. If the FollowerEntry
// does not exist, a nil FollowerEntry and nil error is returned.
func (repo *dynamoRepository) GetFollowerEntry(poster, follower string) (*FollowerEntry, error) {
	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"poster":   {S: &poster},
			"follower": {S: &follower},
		},
		TableName: &followersTable,
	}

	result, err := repo.svc.GetItem(input)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB GetItem failure", err)
	}

	if result.Item == nil {
		return nil, nil
	}

	entry := &FollowerEntry{}
	err = dynamodbattribute.UnmarshalMap(result.Item, entry)
	return entry, errors.Wrap(500, "Temporary server error", "Failed to unmarshal DynamoDB GetItem result", err)

}

// ListFollowers returns a list of FollowerEntry objects where the given username is the Poster.
// The next start key is also returned.
func (repo *dynamoRepository) ListFollowers(username, startKey string) ([]FollowerEntry, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: new("#poster = :poster"),
		ExpressionAttributeNames: map[string]*string{
			"#poster": new("poster"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":poster": {S: new(username)},
		},
		TableName: new(followersTable),
	}

	var followers []FollowerEntry
	lastKey, err := repo.query(input, startKey, &followers)
	if err != nil {
		return nil, "", err
	}
	return followers, lastKey, nil
}

// ListFollowing returns a list of FollowerEntry objects where the given username is the Follower.
// The next start key is also returned. This is equivalent to ListFollowingLimit(username, startKey, -1).
func (repo *dynamoRepository) ListFollowing(username, startKey string) ([]FollowerEntry, string, error) {
	return repo.ListFollowingLimit(username, startKey, -1)
}

// ListFollowingLimit returns a list of FollowerEntry objects where the given username is the Follower.
// The next start key is also returned. If limit is positive, it is used as the upper bound on the
// number of results returned. If non-positive, it is ignored.
func (repo *dynamoRepository) ListFollowingLimit(username, startKey string, limit int) ([]FollowerEntry, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: new("#follower = :follower"),
		ExpressionAttributeNames: map[string]*string{
			"#follower": new("follower"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":follower": {S: new(username)},
		},
		IndexName: new("FollowingIndex"),
		TableName: new(followersTable),
	}

	if limit > 0 {
		input.SetLimit(int64(limit))
	}

	var following []FollowerEntry
	lastKey, err := repo.query(input, startKey, &following)
	if err != nil {
		return nil, "", err
	}
	return following, lastKey, nil
}
