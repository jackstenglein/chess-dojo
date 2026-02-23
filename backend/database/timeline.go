package database

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

type TimelineEntryKey struct {
	// The username of the user that created this timeline entry. Hash key
	// of the Timeline table.
	Owner string `dynamodbav:"owner" json:"owner"`

	// Range key of the Timeline table. Formatted as date_uuid. The date
	// is the date the entry was originally created, but cannot be changed
	// since it is part of the table's key. If the user wants to change the
	// date, the createdAt field should be changed instead.
	Id string `dynamodbav:"id" json:"id"`
}

type TimelineEntry struct {
	TimelineEntryKey

	// The display name of the user that created this timeline entry.
	OwnerDisplayName string `dynamodbav:"ownerDisplayName" json:"ownerDisplayName"`

	// The id of the requirement that the timeline entry applies to.
	RequirementId string `dynamodbav:"requirementId" json:"requirementId"`

	// The name of the requirement that the timeline entry applies to.
	RequirementName string `dynamodbav:"requirementName" json:"requirementName"`

	// The category of the requirement that the timeline entry applies to.
	RequirementCategory string `dynamodbav:"requirementCategory" json:"requirementCategory"`

	// Whether the requirement is custom or not.
	IsCustomRequirement bool `dynamodbav:"isCustomRequirement" json:"isCustomRequirement"`

	// How the requirement should be displayed on the scoreboard.
	ScoreboardDisplay ScoreboardDisplay `dynamodbav:"scoreboardDisplay" json:"scoreboardDisplay"`

	// The requirement's progress bar suffix
	ProgressBarSuffix string `dynamodbav:"progressBarSuffix" json:"progressBarSuffix"`

	// The cohort the timeline entry applies to
	Cohort DojoCohort `dynamodbav:"cohort" json:"cohort"`

	// The total value of the requirement
	TotalCount int `dynamodbav:"totalCount" json:"totalCount"`

	// The value of the user's progress prior to the timeline entry
	PreviousCount int `dynamodbav:"previousCount" json:"previousCount"`

	// The value of the user's progress after the timeline entry
	NewCount int `dynamodbav:"newCount" json:"newCount"`

	// The dojo points gained by this timeline entry.
	DojoPoints float32 `dynamodbav:"dojoPoints" json:"dojoPoints"`

	// The total dojo points earned on the task by the user.
	TotalDojoPoints float32 `dynamodbav:"totalDojoPoints" json:"totalDojoPoints"`

	// The number of minutes spent on the timeline entry
	MinutesSpent int `dynamodbav:"minutesSpent" json:"minutesSpent"`

	// The total number of minutes spent on the task
	TotalMinutesSpent int `dynamodbav:"totalMinutesSpent" json:"totalMinutesSpent"`

	// The date of the timeline entry
	Date string `dynamodbav:"date" json:"date"`

	// The time the timeline entry was created in the database
	CreatedAt string `dynamodbav:"createdAt" json:"createdAt"`

	// The info on graduation, if this timeline entry is for a graduation
	GraduationInfo *TimelineGraduationInfo `dynamodbav:"graduationInfo,omitempty" json:"graduationInfo,omitempty"`

	// The info on game submission, if this timeline entry is for a game submission
	GameInfo *TimelineGameInfo `dynamodbav:"gameInfo,omitempty" json:"gameInfo,omitempty"`

	// The notes the user left on the timeline entry
	Notes string `dynamodbav:"notes,omitempty" json:"notes"`

	// The comments left on the timeline entry
	Comments []Comment `dynamodbav:"comments,omitempty" json:"comments"`

	// The reactions left on the timeline entry as a map from the
	// username of the reactor
	Reactions map[string]Reaction `dynamodbav:"reactions" json:"reactions"`
}

// The info on graduation that is copied into the timeline entry
type TimelineGraduationInfo struct {
	// The comments the user left when graduating
	Comments string `dynamodbav:"comments" json:"comments"`

	// The dojo score at the time of graduation
	DojoScore float32 `dynamodbav:"dojoScore" json:"dojoScore"`

	// The user's new dojo cohort
	NewCohort DojoCohort `dynamodbav:"newCohort" json:"newCohort"`

	// The amount of time spent in minutes on dojo tasks in the cohort
	DojoMinutes int `dynamodbav:"dojoMinutes" json:"dojoMinutes"`

	// The amount of time spent in minutes on non-dojo tasks in the cohort
	NonDojoMinutes int `dynamodbav:"nonDojoMinutes" json:"nonDojoMinutes"`

	// The number of games annotated at the time of graduation.
	GamesAnnotated int `dynamodbav:"gamesAnnotated,omitempty" json:"gamesAnnotated,omitempty"`
}

// The info on game submission that is copied into the timeline entry
type TimelineGameInfo struct {
	// The id of the game
	Id string `dynamodbav:"id" json:"id"`

	// The headers of the game
	Headers map[string]string `dynamodbav:"headers" json:"headers"`
}

type Reaction struct {
	// The username of the person reacting
	Username string `dynamodbav:"username" json:"username"`

	// The display name of the person reacting
	DisplayName string `dynamodbav:"displayName" json:"displayName"`

	// The cohort of the person reacting
	Cohort DojoCohort `dynamodbav:"cohort" json:"cohort"`

	// The time the reaction was last updated
	UpdatedAt string `dynamodbav:"updatedAt" json:"updatedAt"`

	// The types of reaction the person left
	Types []string `dynamodbav:"types,stringset" json:"types"`
}

type TimelinePutter interface {
	// PutTimelineEntry saves the provided TimelineEntry into the database.
	PutTimelineEntry(entry *TimelineEntry) error
}

type TimelineEditor interface {
	TimelinePutter

	// PutTimelineEntries inserts the provided TimelineEntries into the database. The number of
	// successfully inserted entries is returned.
	PutTimelineEntries(entries []*TimelineEntry) (int, error)

	// DeleteTimelineEntries deleted the provided TimelineEntries from the database. The number of
	// successfully deleted entries is returned.
	DeleteTimelineEntries(entries []*TimelineEntry) (int, error)
}

type TimelineGetter interface {
	// GetTimelineEntry returns the TimelineEntry with the provided owner and id.
	GetTimelineEntry(owner, id string) (*TimelineEntry, error)
}

type TimelineLister interface {
	// ListTimelineEntries returns a list of TimelineEntries with the provided owner,
	// up to 1MB of data. startKey can be passed to perform pagination.
	ListTimelineEntries(owner string, startKey string) ([]*TimelineEntry, string, error)
}

type TimelineCommenter interface {
	UserGetter

	CreateTimelineComment(owner, id string, comment *Comment) (*TimelineEntry, error)
}

type TimelineReactor interface {
	UserGetter

	// SetTimelineReaction sets the given reaction on the provided TimelineEntry.
	SetTimelineReaction(owner, id string, reaction *Reaction) (*TimelineEntry, error)
}

// PutTimelineEntry saves the provided TimelineEntry into the database.
func (repo *dynamoRepository) PutTimelineEntry(entry *TimelineEntry) error {
	item, err := dynamodbattribute.MarshalMap(entry)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Unable to marshal timeline entry", err)
	}

	// Hack to work around https://github.com/aws/aws-sdk-go/issues/682
	if len(entry.Reactions) == 0 {
		item["reactions"] = &dynamodb.AttributeValue{M: map[string]*dynamodb.AttributeValue{}}
	}

	input := &dynamodb.PutItemInput{
		Item:      item,
		TableName: aws.String(timelineTable),
	}
	_, err = repo.svc.PutItem(input)
	return errors.Wrap(500, "Temporary server error", "DynamoDB PutItem failure", err)
}

// PutTimelineEntries inserts the provided TimelineEntries into the database. The number of
// successfully inserted entries is returned.
func (repo *dynamoRepository) PutTimelineEntries(entries []*TimelineEntry) (int, error) {
	return batchWriteObjects(repo, entries, timelineTable, func(entry *TimelineEntry, item map[string]*dynamodb.AttributeValue) {
		// Hack to work around https://github.com/aws/aws-sdk-go/issues/682
		if len(entry.Reactions) == 0 {
			item["reactions"] = &dynamodb.AttributeValue{M: map[string]*dynamodb.AttributeValue{}}
		}
	})
}

// GetTimelineEntry returns the TimelineEntry with the provided owner and id.
func (repo *dynamoRepository) GetTimelineEntry(owner string, id string) (*TimelineEntry, error) {
	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"owner": {S: &owner},
			"id":    {S: &id},
		},
		TableName: &timelineTable,
	}

	entry := TimelineEntry{}
	if err := repo.getItem(input, &entry); err != nil {
		return nil, err
	}
	return &entry, nil
}

// ListTimelineEntries returns a list of TimelineEntries with the provided owner,
// up to 1MB of data. startKey can be passed to perform pagination.
func (repo *dynamoRepository) ListTimelineEntries(owner string, startKey string) ([]*TimelineEntry, string, error) {
	return repo.listTimelineEntriesWithLimit(owner, startKey, -1)
}

// listTimelineEntriesWithLimit returns a list of TimelineEntries with the provided owner,
// up to the number of items specified by limit. If limit is <= 0, then up to 1MB of data
// is returned. startKey can be passed to perform pagination.
func (repo *dynamoRepository) listTimelineEntriesWithLimit(owner, startKey string, limit int64) ([]*TimelineEntry, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: aws.String("#owner = :owner"),
		ExpressionAttributeNames: map[string]*string{
			"#owner": aws.String("owner"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":owner": {S: aws.String(owner)},
		},
		TableName:        aws.String(timelineTable),
		ScanIndexForward: aws.Bool(false),
	}

	if limit > 0 {
		input.SetLimit(limit)
	}

	var entries []*TimelineEntry
	lastKey, err := repo.query(input, startKey, &entries)
	if err != nil {
		return nil, "", err
	}
	return entries, lastKey, nil
}

// DeleteTimelineEntries deleted the provided TimelineEntries from the database. The number of
// successfully deleted entries is returned.
func (repo *dynamoRepository) DeleteTimelineEntries(entries []*TimelineEntry) (int, error) {
	var deleteRequests []*dynamodb.WriteRequest
	deleted := 0

	for _, e := range entries {
		req := &dynamodb.WriteRequest{
			DeleteRequest: &dynamodb.DeleteRequest{
				Key: map[string]*dynamodb.AttributeValue{
					"owner": {S: aws.String(e.Owner)},
					"id":    {S: aws.String(e.Id)},
				},
			},
		}
		deleteRequests = append(deleteRequests, req)

		if len(deleteRequests) == 25 {
			if err := repo.batchWrite(deleteRequests, timelineTable); err != nil {
				return deleted, err
			}
			deleted += 25
			deleteRequests = nil
		}
	}

	if len(deleteRequests) > 0 {
		if err := repo.batchWrite(deleteRequests, timelineTable); err != nil {
			return deleted, err
		}
		deleted += len(deleteRequests)
	}

	return deleted, nil
}

func (repo *dynamoRepository) BatchGetTimelineEntries(entries map[string]TimelineEntryKey) ([]TimelineEntry, error) {
	if len(entries) == 0 {
		return []TimelineEntry{}, nil
	}
	if len(entries) > 100 {
		return nil, errors.New(500, "Temporary server error", "More than 100 items in BatchGetTimelineEntries request")
	}

	input := &dynamodb.BatchGetItemInput{
		RequestItems: map[string]*dynamodb.KeysAndAttributes{
			timelineTable: {
				Keys: []map[string]*dynamodb.AttributeValue{},
			},
		},
	}

	for _, e := range entries {
		key := map[string]*dynamodb.AttributeValue{
			"owner": {S: aws.String(e.Owner)},
			"id":    {S: aws.String(e.Id)},
		}
		input.RequestItems[timelineTable].Keys = append(input.RequestItems[timelineTable].Keys, key)
	}

	result, err := repo.svc.BatchGetItem(input)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed call to BatchGetItem", err)
	}
	list := result.Responses[timelineTable]

	var resultEntries []TimelineEntry
	if err := dynamodbattribute.UnmarshalListOfMaps(list, &resultEntries); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal BatchGetItem result", err)
	}

	return resultEntries, nil
}

func (repo *dynamoRepository) CreateTimelineComment(owner, id string, comment *Comment) (*TimelineEntry, error) {
	item, err := dynamodbattribute.MarshalMap(comment)
	if err != nil {
		return nil, errors.Wrap(400, "Invalid request: comment cannot be marshaled", "", err)
	}

	input := &dynamodb.UpdateItemInput{
		ConditionExpression: aws.String("attribute_exists(#owner)"),
		Key: map[string]*dynamodb.AttributeValue{
			"owner": {S: aws.String(owner)},
			"id":    {S: aws.String(id)},
		},
		UpdateExpression: aws.String("SET #c = list_append(if_not_exists(#c, :empty_list), :c)"),
		ExpressionAttributeNames: map[string]*string{
			"#c":     aws.String("comments"),
			"#owner": aws.String("owner"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":c": {
				L: []*dynamodb.AttributeValue{
					{M: item},
				},
			},
			":empty_list": {L: []*dynamodb.AttributeValue{}},
		},
		ReturnValues: aws.String("ALL_NEW"),
		TableName:    aws.String(timelineTable),
	}

	result, err := repo.svc.UpdateItem(input)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(400, "Invalid request: timeline entry not found", "DynamoDB conditional check failed", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB UpdateItem failure", err)
	}

	entry := TimelineEntry{}
	if err = dynamodbattribute.UnmarshalMap(result.Attributes, &entry); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal CreateTimelineComment result", err)
	}
	return &entry, nil
}

// SetTimelineReaction sets the given reaction on the provided TimelineEntry.
func (repo *dynamoRepository) SetTimelineReaction(owner, id string, reaction *Reaction) (*TimelineEntry, error) {
	item, err := dynamodbattribute.MarshalMap(reaction)
	if err != nil {
		return nil, errors.Wrap(400, "Invalid request: reaction cannot be marshaled", "", err)
	}

	input := &dynamodb.UpdateItemInput{
		ConditionExpression: aws.String("attribute_exists(#owner)"),
		Key: map[string]*dynamodb.AttributeValue{
			"owner": {S: aws.String(owner)},
			"id":    {S: aws.String(id)},
		},
		UpdateExpression: aws.String("SET #reactions.#username = :r"),
		ExpressionAttributeNames: map[string]*string{
			"#owner":     aws.String("owner"),
			"#reactions": aws.String("reactions"),
			"#username":  aws.String(reaction.Username),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":r": {M: item},
		},
		ReturnValues: aws.String("ALL_NEW"),
		TableName:    aws.String(timelineTable),
	}

	result, err := repo.svc.UpdateItem(input)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(400, "Invalid request: timeline entry not found", "DynamoDB conditional check failed", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB UpdateItem failure", err)
	}

	entry := TimelineEntry{}
	if err = dynamodbattribute.UnmarshalMap(result.Attributes, &entry); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal SetTimelineReaction result", err)
	}
	return &entry, nil
}
