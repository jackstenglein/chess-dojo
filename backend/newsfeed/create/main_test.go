package main

import (
	"testing"
	"time"

	"github.com/aws/aws-lambda-go/events"
)

func timelineRecord(requirementId, date string) events.DynamoDBEventRecord {
	return events.DynamoDBEventRecord{Change: events.DynamoDBStreamRecord{NewImage: map[string]events.DynamoDBAttributeValue{
		"requirementId": events.NewStringAttribute(requirementId),
		"date":          events.NewStringAttribute(date),
	}}}
}

func TestIsPastForgerEntry(t *testing.T) {
	now := time.Date(2026, 11, 26, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name          string
		requirementId string
		date          string
		want          bool
	}{
		{"past Forger session", "dojo-tactics-forger", "2026-11-20T09:00:00Z", true},
		{"live Forger session", "dojo-tactics-forger", "2026-11-26T11:58:00Z", false},
		{"Forger entry without a date", "dojo-tactics-forger", "", false},
		{"other task dated in the past", "some-task", "2026-11-20T09:00:00Z", false},
	}
	for _, tc := range tests {
		if got := isPastForgerEntry(timelineRecord(tc.requirementId, tc.date), now); got != tc.want {
			t.Errorf("%s: got %v, want %v", tc.name, got, tc.want)
		}
	}
}
