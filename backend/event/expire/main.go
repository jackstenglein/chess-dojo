package main

import (
	"context"
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/discord"
)

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event events.DynamoDBEvent) error {
	log.Infof("Event: %#v", event)

	for _, record := range event.Records {
		if record.EventName != "REMOVE" {
			continue
		}

		event := database.Event{}
		unmarshalStreamImage(record.Change.OldImage, &event)
		if err := discord.DeleteEventNotification(&event); err != nil {
			log.Error("Failed discord.DeleteMessage: ", err)
		}
	}

	return nil
}

// unmarshalStreamImage converts events.DynamoDBAttributeValue to struct
func unmarshalStreamImage(attribute map[string]events.DynamoDBAttributeValue, out any) error {
	dbAttrMap := make(map[string]*dynamodb.AttributeValue)

	for k, v := range attribute {
		var dbAttr dynamodb.AttributeValue
		bytes, marshalErr := v.MarshalJSON()
		if marshalErr != nil {
			return marshalErr
		}

		json.Unmarshal(bytes, &dbAttr)
		dbAttrMap[k] = &dbAttr
	}

	return dynamodbattribute.UnmarshalMap(dbAttrMap, out)
}
