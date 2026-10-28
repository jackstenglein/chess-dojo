package database

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

type CourseReview struct {
	CourseKey        string `json:"-" dynamodbav:"courseKey"`
	Username         string `json:"username" dynamodbav:"username"`
	DisplayName      string `json:"displayName" dynamodbav:"displayName"`
	Rating           int    `json:"rating" dynamodbav:"rating"`
	Review           string `json:"review" dynamodbav:"review"`
	ModerationStatus string `json:"moderationStatus" dynamodbav:"moderationStatus"`
	UpdatedAt        string `json:"updatedAt" dynamodbav:"updatedAt"`
}

func CanReviewCourse(user *User, course *Course) bool {
	if user == nil {
		return false
	}
	if user.PurchasedCourses[course.Id] {
		return true
	}
	switch user.GetSubscriptionTier() {
	case SubscriptionTier_Basic, SubscriptionTier_Lecture, SubscriptionTier_GameReview:
		return true
	}
	return false
}

type CourseReviewRepository interface {
	CourseGetter
	ListCourseReviews(key, startKey string) ([]CourseReview, string, error)
	GetCourseReview(key, username string) (*CourseReview, error)
	SaveCourseReview(review *CourseReview) error
	DeleteCourseReview(key, username string) error
	ApproveCourseReview(key, username, updatedAt string) error
}

var courseReviewsTable = stage + "-course-reviews"

func reviewKey(key, username string) map[string]*dynamodb.AttributeValue {
	return map[string]*dynamodb.AttributeValue{"courseKey": {S: aws.String(key)}, "username": {S: aws.String(username)}}
}
func (repo *dynamoRepository) ListCourseReviews(key, startKey string) ([]CourseReview, string, error) {
	reviews := []CourseReview{}
	next, err := repo.query(&dynamodb.QueryInput{
		TableName: aws.String(courseReviewsTable), ConsistentRead: aws.Bool(true), Limit: aws.Int64(50),
		KeyConditionExpression:    aws.String("courseKey = :key"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{":key": {S: aws.String(key)}},
	}, startKey, &reviews)
	return reviews, next, err
}
func (repo *dynamoRepository) GetCourseReview(key, username string) (*CourseReview, error) {
	output, err := repo.svc.GetItem(&dynamodb.GetItemInput{TableName: aws.String(courseReviewsTable), Key: reviewKey(key, username), ConsistentRead: aws.Bool(true)})
	if err != nil {
		return nil, errors.Wrap(500, "Unable to load review", "GetItem", err)
	}
	if len(output.Item) == 0 {
		return nil, nil
	}
	var review CourseReview
	if err := dynamodbattribute.UnmarshalMap(output.Item, &review); err != nil {
		return nil, errors.Wrap(500, "Unable to load review", "UnmarshalMap", err)
	}
	return &review, nil
}
func (repo *dynamoRepository) SaveCourseReview(review *CourseReview) error {
	item, err := dynamodbattribute.MarshalMap(review)
	if err != nil {
		return errors.Wrap(500, "Unable to save review", "MarshalMap", err)
	}
	_, err = repo.svc.PutItem(&dynamodb.PutItemInput{TableName: aws.String(courseReviewsTable), Item: item})
	return errors.Wrap(500, "Unable to save review", "PutItem", err)
}
func (repo *dynamoRepository) DeleteCourseReview(key, username string) error {
	_, err := repo.svc.DeleteItem(&dynamodb.DeleteItemInput{TableName: aws.String(courseReviewsTable), Key: reviewKey(key, username)})
	return errors.Wrap(500, "Unable to remove review", "DeleteItem", err)
}

// Approve only the exact text version the administrator inspected.
func (repo *dynamoRepository) ApproveCourseReview(key, username, updatedAt string) error {
	_, err := repo.svc.UpdateItem(&dynamodb.UpdateItemInput{
		TableName: aws.String(courseReviewsTable), Key: reviewKey(key, username),
		UpdateExpression:    aws.String("SET moderationStatus = :approved"),
		ConditionExpression: aws.String("attribute_exists(username) AND updatedAt = :version"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":approved": {S: aws.String("APPROVED")}, ":version": {S: aws.String(updatedAt)},
		},
	})
	if failure, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
		return errors.Wrap(409, "This review changed. Reload before approving it.", "Review version changed", failure)
	}
	return errors.Wrap(500, "Unable to approve review", "UpdateItem", err)
}
