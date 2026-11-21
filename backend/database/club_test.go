package database

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

func TestClubUpdateUnlisted(t *testing.T) {
	table := []struct {
		body string
		want *dynamodb.AttributeValue
	}{
		{body: `{"unlisted":false}`, want: &dynamodb.AttributeValue{BOOL: aws.Bool(false)}},
		{body: `{"unlisted":true}`, want: &dynamodb.AttributeValue{BOOL: aws.Bool(true)}},
		{body: `{}`, want: nil},
	}

	for _, tc := range table {
		t.Run(tc.body, func(t *testing.T) {
			update := &ClubUpdate{}
			if err := json.Unmarshal([]byte(tc.body), update); err != nil {
				t.Fatalf("Unmarshal(%s) got error %v", tc.body, err)
			}
			av, err := dynamodbattribute.Marshal(update)
			if err != nil {
				t.Fatalf("Marshal(%s) got error %v", tc.body, err)
			}

			if got := av.M["unlisted"]; !reflect.DeepEqual(got, tc.want) {
				t.Errorf("unlisted for body %s got %v; want %v", tc.body, got, tc.want)
			}
		})
	}
}
