package database

import (
	"github.com/aws/aws-sdk-go/service/dynamodb"
)

type GameReviewCohort struct {
	// The primary key of the DynamoDB table. Always GAME_REVIEW_COHORT.
	Type string `dynamodbav:"type" json:"type"`
	// The id of the game review cohort.
	Id string `dynamodbav:"id" json:"id"`
	// The name of the game review cohort.
	Name string `dynamodbav:"name" json:"name"`
	// The Discord channel id for this cohort.
	DiscordChannelId string `dynamodbav:"discordChannelId" json:"discordChannelId"`
	// The members of this cohort.
	Members map[string]GameReviewCohortMember `dynamodbav:"members" json:"members"`
	// The id of the calendar event for the peer review session.
	PeerReviewEventId string `dynamodbav:"peerReviewEventId" json:"peerReviewEventId"`
	// The peer review event. Output only, will not be saved to the database.
	PeerReviewEvent Event `dynamodbav:"-" json:"peerReviewEvent"`
	// The id of the calendar event for the sensei review session
	SenseiReviewEventId string `dynamodbav:"senseiReviewEventId" json:"senseiReviewEventId"`
	// The sensei review event. Output only, will not be saved to the database.
	SenseiReviewEvent Event `dynamodbav:"-" json:"senseiReviewEvent"`
	// The date the queue order of a member was last reset.
	QueueLastResetAt string `dynamodbav:"queueLastResetAt" json:"queueLastResetAt"`
}

type GameReviewCohortMember struct {
	// The username of the member.
	Username string `dynamodbav:"username" json:"username"`
	// The display name of the member.
	DisplayName string `dynamodbav:"displayName" json:"displayName"`
	// The date the member joined the queue.
	QueueDate string `dynamodbav:"queueDate" json:"queueDate"`
}

func (repo *dynamoRepository) GetGameReviewCohort(id string) (*GameReviewCohort, error) {
	input := dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type": {S: new("GAME_REVIEW_COHORT")},
			"id":   {S: new(id)},
		},
		TableName: new(liveClassesTable),
	}
	var output GameReviewCohort
	err := repo.getItem(&input, &output)
	return &output, err
}
