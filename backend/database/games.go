package database

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/aws/aws-sdk-go/service/dynamodb/expression"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

type PlayerColor string

const (
	White  PlayerColor = "white"
	Black  PlayerColor = "black"
	Either PlayerColor = "either"
)

type GameReviewStatus string

const (
	// Games that are currently waiting for review.
	GameReviewStatus_Pending GameReviewStatus = "PENDING"

	// Games that are not currently waiting for review.
	// This value is an empty string to take advantage of sparse Dynamo indices.
	GameReviewStatus_None GameReviewStatus = ""
)

type GameReviewType string

const (
	// A quick, 15-20 min game review
	GameReviewType_Quick GameReviewType = "QUICK"

	// A deep dive, 30-45 min game review
	GameReviewType_DeepDive GameReviewType = "DEEP"
)

type byDate []*Game

func (s byDate) Len() int {
	return len(s)
}

func (s byDate) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}

func (s byDate) Less(i, j int) bool {
	// We return games in descending order,
	// so use > here
	return s[i].Date > s[j].Date
}

type Comment struct {
	// The Cognito username of the poster of the comment
	Owner string `dynamodbav:"owner" json:"owner"`

	// The display name of the poster of the comment
	OwnerDisplayName string `dynamodbav:"ownerDisplayName" json:"ownerDisplayName"`

	// The cohort of the poster of the comment
	OwnerCohort DojoCohort `dynamodbav:"ownerCohort" json:"ownerCohort"`

	// The cohort the owner most recently graduated from
	OwnerPreviousCohort DojoCohort `dynamodbav:"ownerPreviousCohort" json:"ownerPreviousCohort"`

	// A v4 UUID identifying the comment
	Id string `dynamodbav:"id" json:"id"`

	// The time the comment was created
	CreatedAt string `dynamodbav:"createdAt" json:"createdAt"`

	// The time the comment was updated
	UpdatedAt string `dynamodbav:"updatedAt" json:"updatedAt"`

	// The content of the comment
	Content string `dynamodbav:"content" json:"content"`
}

type CommentOwner struct {
	// The Cognito username of the comment owner
	Username string `dynamodbav:"username" json:"username"`

	// The display name of the comment owner
	DisplayName string `dynamodbav:"displayName" json:"displayName"`

	// The current cohort of the comment owner, at the time of creating the comment
	Cohort string `dynamodbav:"cohort" json:"cohort"`

	// The cohort the comment owner most recently graduated from,
	// at the time of creating the comment
	PreviousCohort string `dynamodbav:"previousCohort,omitempty" json:"previousCohort,omitempty"`
}

type PositionComment struct {
	// A v4 UUID identifying the comment.
	Id string `dynamodbav:"id" json:"id"`

	// The normalized FEN of the position the comment was added to.
	Fen string `dynamodbav:"fen" json:"fen"`

	// The ply of the position the comment was added to.
	Ply int `dynamodbav:"ply,omitempty" json:"ply"`

	// The SAN of the position the comment was added to, or an empty string
	// if the comment was added to the beginning of the game.
	San string `dynamodbav:"san,omitempty" json:"san,omitempty"`

	// The poster of the comment
	Owner CommentOwner `dynamodbav:"owner" json:"owner"`

	// The time the comment was created
	CreatedAt string `dynamodbav:"createdAt" json:"createdAt"`

	// The time the comment was last updated
	UpdatedAt string `dynamodbav:"updatedAt" json:"updatedAt"`

	// The text content of the comment, which may contain mention markup.
	Content string `dynamodbav:"content" json:"content"`

	// A comma-separated list of the parent comment ids. Empty for a top-level comment.
	ParentIds string `dynamodbav:"parentIds,omitempty" json:"parentIds"`

	// Replies to this comment, mapped by their IDs
	Replies map[string]PositionComment `dynamodbav:"replies" json:"replies"`

	// A PGN starting from the comment's position, which suggests a variation.
	SuggestedVariation string `dynamodbav:"suggestedVariation,omitempty" json:"suggestedVariation,omitempty"`
}

type PositionCommentUpdate struct {
	// The cohort of the game containing the comment
	Cohort DojoCohort `json:"cohort"`

	// The id of the game containing the comment
	GameId string `json:"gameId"`

	// The id of the comment to update.
	Id string `json:"id"`

	// The normalized FEN of the comment to update.
	Fen string `json:"fen"`

	// The new text content of the comment, which may contain mention markup.
	Content string `json:"content"`

	// A comma-separated list of the parent comment ids. Empty for a top-level comment.
	ParentIds string `json:"parentIds"`

	// A PGN starting from the comment's position, which suggests a variation.
	SuggestedVariation string `json:"suggestedVariation"`
}

type Game struct {
	// The Dojo cohort for the game
	Cohort DojoCohort `dynamodbav:"cohort" json:"cohort"`

	// The sort key of the game, in the form of date_uuid for newer games. Note that
	// the date value is taken from the createdAt value, but has dashes replaced with periods
	// to match the PGN specification.
	Id string `dynamodbav:"id" json:"id"`

	// The player with the white pieces
	White string `dynamodbav:"white" json:"white"`

	// The player with the black pieces
	Black string `dynamodbav:"black" json:"black"`

	// The date that the game was played, in the form 2023.01.02
	// We use periods instead of dashes to match the PGN specification.
	Date string `dynamodbav:"date" json:"date"`

	// The date and time the game was created. This is in the time.RFC3339 format.
	CreatedAt string `dynamodbav:"createdAt" json:"createdAt"`

	// The date and time the game was last modified in time.RFC3339 format.
	UpdatedAt string `dynamodbav:"updatedAt" json:"updatedAt,omitempty"`

	// The date and time the game was first published in time.RFC3339 format.
	PublishedAt string `dynamodbav:"publishedAt,omitempty" json:"publishedAt,omitempty"`

	// The username of the owner of this game
	Owner string `dynamodbav:"owner" json:"owner"`

	// The display name of the owner of this game
	OwnerDisplayName string `dynamodbav:"ownerDisplayName" json:"ownerDisplayName"`

	// The cohort the owner most recently graduated from
	OwnerPreviousCohort DojoCohort `dynamodbav:"ownerPreviousCohort" json:"ownerPreviousCohort"`

	// The PGN headers of the game
	Headers map[string]string `dynamodbav:"headers" json:"headers"`

	// Whether the game has been featured by the sensei
	IsFeatured string `dynamodbav:"isFeatured,omitempty" json:"isFeatured,omitempty"`

	// The date the game was marked as featured
	FeaturedAt string `dynamodbav:"featuredAt,omitempty" json:"featuredAt,omitempty"`

	// The PGN text of the game
	Pgn string `dynamodbav:"pgn" json:"pgn,omitempty"`

	// The comments left on the game
	Comments []*Comment `dynamodbav:"comments" json:"comments"`

	// The default board orientation for the game
	Orientation string `dynamodbav:"orientation" json:"orientation,omitempty"`

	// Whether the game is unlisted
	Unlisted bool `dynamodbav:"unlisted" json:"unlisted"`

	// The ID of the timeline entry associated with this game's publishing
	TimelineId string `dynamodbav:"timelineId" json:"timelineId"`

	// The review status of the game. Omitted from the database if empty to take advantage of sparse
	// DynamoDB indices.
	ReviewStatus GameReviewStatus `dynamodbav:"reviewStatus,omitempty" json:"reviewStatus,omitempty"`

	// The date the user requested a review for this game in time.RFC3339 format. Omitted from the
	// database if empty to take advantage of sparse DynamoDB indices.
	ReviewRequestedAt string `dynamodbav:"reviewRequestedAt,omitempty" json:"reviewRequestedAt,omitempty"`

	// The game review metadata
	Review *GameReview `dynamodbav:"review,omitempty" json:"review,omitempty"`

	// A map from the normalized FEN of a position to a map from the id of a comment to the comment.
	PositionComments map[string]map[string]PositionComment `dynamodbav:"positionComments" json:"positionComments"`

	// A set of directories containing this game, in the form `owner/id`.
	Directories []string `dynamodbav:"directories,stringset,omitempty" json:"directories,omitempty"`

	// The time management rating for white in this game.
	TimeManagementRatingWhite int `dynamodbav:"timeManagementRatingWhite,omitempty" json:"timeManagementRatingWhite,omitempty"`

	// The time management rating for black in this game.
	TimeManagementRatingBlack int `dynamodbav:"timeManagementRatingBlack,omitempty" json:"timeManagementRatingBlack,omitempty"`
}

type Reviewer struct {
	// The username of the reviewer.
	Username string `dynamodbav:"username" json:"username"`

	// The display name of the reviewer.
	DisplayName string `dynamodbav:"displayName" json:"displayName"`

	// The cohort of the reviewer.
	Cohort DojoCohort `dynamodbav:"cohort" json:"cohort"`
}

type GameReview struct {
	// The type of review requested.
	Type GameReviewType `dynamodbav:"type" json:"type"`

	// The Stripe id of the checkout session associated with this review.
	StripeId string `dynamodbav:"stripeId" json:"-"`

	// The date the game was reviewed in time.RFC3339 format.
	ReviewedAt string `dynamodbav:"reviewedAt,omitempty" json:"reviewedAt,omitempty"`

	// The reviewer of the game.
	Reviewer *Reviewer `dynamodbav:"reviewer,omitempty" json:"reviewer,omitempty"`
}

type GameUpdate struct {
	// The review status of the game. Omitted from the database if empty to take advantage of sparse
	// DynamoDB indices.
	ReviewStatus *GameReviewStatus `dynamodbav:"reviewStatus"`

	// The date the user requested a review for this game in time.RFC3339 format. Omitted from the
	// database if empty to take advantage of sparse DynamoDB indices.
	ReviewRequestedAt *string `dynamodbav:"reviewRequestedAt,omitempty"`

	// The game review metadata
	Review *GameReview `dynamodbav:"review,omitempty"`
}

type GamePutter interface {
	UserGetter
	TimelinePutter

	// BatchPutGames inserts the provided list of games into the database.
	BatchPutGames(games []*Game) (int, error)

	// RecordGameCreation updates the given user to increase their game creation stats.
	RecordGameCreation(user *User, amount int) error
}

type GameDeleter interface {
	// DeleteGame removes the specified game from the database, if the game
	// is owned by the calling user.
	DeleteGame(username, cohort, id string) (*Game, error)
}

type GameGetter interface {
	// GetGame returns the Game object with the provided cohort and id.
	GetGame(cohort, id string) (*Game, error)
}

type GameLister interface {
	// ListGamesByCohort returns a list of Games matching the provided cohort. The PGN text is excluded and must be
	// fetched separately with a call to GetGame.
	ListGamesByCohort(cohort, startDate, endDate, startKey string) ([]*Game, string, error)

	// ListGamesByOwner returns a list of Games matching the provided owner. The PGN text is excluded and must be
	// fetched separately with a call to GetGame. Unlisted games are not included, unless isOwner is true.
	ListGamesByOwner(isOwner bool, owner, startDate, endDate, startKey string) ([]*Game, string, error)

	// ListGamesByPlayer returns a list of Games matching the provided player. The PGN text is excluded and must
	// be fetched separately with a call to GetGame.
	ListGamesByPlayer(player string, color PlayerColor, startDate, endDate, startKey string) ([]*Game, string, error)

	// ListFeaturedGames returns a list of Games featured more recently than the provided date.
	ListFeaturedGames(date, startKey string) ([]*Game, string, error)

	// ListGamesByEco returns a list of Games matching the provided ECO. The PGN text is excluded and must be
	// fetched separately with a call to GetGame.
	ListGamesByEco(eco, startDate, endDate, startKey string) ([]*Game, string, error)

	// ScanCohort returns a list of all Games in the given cohort, including the PGN text.
	ScanCohort(cohort DojoCohort, startKey string) ([]*Game, string, error)
}

type GameCommenter interface {
	// PutComment puts the provided comment in the provided Game's position comments.
	PutComment(cohort, id string, comment *PositionComment, skipMapCreation bool) (*Game, error)
}

// GetGame returns the game object with the provided cohort and id.
func (repo *dynamoRepository) GetGame(cohort, id string) (*Game, error) {
	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"cohort": {
				S: aws.String(cohort),
			},
			"id": {
				S: aws.String(id),
			},
		},
		TableName: aws.String(gameTable),
	}

	game := Game{}
	if err := repo.getItem(input, &game); err != nil {
		return nil, err
	}
	return &game, nil
}

// DeleteGame removes the specified game from the database, if the game
// is owned by the calling user.
func (repo *dynamoRepository) DeleteGame(username, cohort, id string) (*Game, error) {
	input := &dynamodb.DeleteItemInput{
		ConditionExpression: aws.String("#owner = :owner"),
		ExpressionAttributeNames: map[string]*string{
			"#owner": aws.String("owner"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":owner": {S: aws.String(username)},
		},
		Key: map[string]*dynamodb.AttributeValue{
			"cohort": {S: aws.String(cohort)},
			"id":     {S: aws.String(id)},
		},
		ReturnValues: aws.String("ALL_OLD"),
		TableName:    aws.String(gameTable),
	}

	result, err := repo.svc.DeleteItem(input)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(400, "Invalid request: game does not exist or you do not have permission to delete it", "Dynamo conditional check failed", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "Failed Dynamo DeleteItem call", err)
	}

	game := Game{}
	if err := dynamodbattribute.UnmarshalMap(result.Attributes, &game); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal DeleteItem result", err)
	}
	return &game, nil
}

// addDates adds the provided start and end dates to the given key condition expression and expression attribute maps.
func addDates(keyConditionExpression string, expressionAttributeNames map[string]*string, expressionAttributeValues map[string]*dynamodb.AttributeValue, startDate, endDate string) string {
	if startDate != "" && endDate != "" {
		keyConditionExpression += " AND #id BETWEEN :startId AND :endId"
		expressionAttributeNames["#id"] = aws.String("id")
		expressionAttributeValues[":startId"] = &dynamodb.AttributeValue{
			S: aws.String(startDate + "_00000000-0000-0000-0000-000000000000"),
		}
		expressionAttributeValues[":endId"] = &dynamodb.AttributeValue{
			S: aws.String(endDate + "_ffffffff-ffff-ffff-ffff-ffffffffffff"),
		}
	} else if startDate != "" {
		keyConditionExpression += " AND #id >= :startId"
		expressionAttributeNames["#id"] = aws.String("id")
		expressionAttributeValues[":startId"] = &dynamodb.AttributeValue{
			S: aws.String(startDate + "_00000000-0000-0000-0000-000000000000"),
		}
	} else if endDate != "" {
		keyConditionExpression += " AND #id <= :endId"
		expressionAttributeNames["#id"] = aws.String("id")
		expressionAttributeValues[":endId"] = &dynamodb.AttributeValue{
			S: aws.String(endDate + "_ffffffff-ffff-ffff-ffff-ffffffffffff"),
		}
	}
	return keyConditionExpression
}

// ListGamesByCohort returns a list of Games matching the provided cohort. The PGN text is excluded and must be
// fetched separately with a call to GetGame.
func (repo *dynamoRepository) ListGamesByCohort(cohort, startDate, endDate, startKey string) ([]*Game, string, error) {
	keyConditionExpression := "#cohort = :cohort"
	expressionAttributeNames := map[string]*string{
		"#cohort":           aws.String("cohort"),
		"#id":               aws.String("id"),
		"#white":            aws.String("white"),
		"#black":            aws.String("black"),
		"#date":             aws.String("date"),
		"#createdAt":        aws.String("createdAt"),
		"#updatedAt":        aws.String("updatedAt"),
		"#publishedAt":      aws.String("publishedAt"),
		"#owner":            aws.String("owner"),
		"#ownerDisplayName": aws.String("ownerDisplayName"),
		"#headers":          aws.String("headers"),
		"#unlisted":         aws.String("unlisted"),
	}
	expressionAttributeValues := map[string]*dynamodb.AttributeValue{
		":cohort": {
			S: aws.String(string(cohort)),
		},
		":modelGames": {
			S: aws.String("model_games"),
		},
		":memorizeGames": {
			S: aws.String("games_to_memorize"),
		},
		":unlisted": {
			BOOL: aws.Bool(true),
		},
	}

	keyConditionExpression = addDates(keyConditionExpression, expressionAttributeNames, expressionAttributeValues, startDate, endDate)

	input := &dynamodb.QueryInput{
		KeyConditionExpression:    aws.String(keyConditionExpression),
		FilterExpression:          aws.String("#owner <> :modelGames AND #owner <> :memorizeGames AND (attribute_not_exists(unlisted) OR #unlisted <> :unlisted)"),
		ExpressionAttributeNames:  expressionAttributeNames,
		ExpressionAttributeValues: expressionAttributeValues,
		ProjectionExpression:      aws.String("#cohort,#id,#white,#black,#date,#createdAt,#updatedAt,#publishedAt,#owner,#ownerDisplayName,#headers"),
		ScanIndexForward:          aws.Bool(false),
		TableName:                 aws.String(gameTable),
	}

	var games []*Game
	lastKey, err := repo.query(input, startKey, &games)
	if err != nil {
		return nil, "", err
	}
	return games, lastKey, nil
}

// ListGamesByOwner returns a list of Games matching the provided owner. The PGN text is excluded and must be
// fetched separately with a call to GetGame. Unlisted games are not included, unless isOwner is true.
func (repo *dynamoRepository) ListGamesByOwner(isOwner bool, owner, startDate, endDate, startKey string) ([]*Game, string, error) {
	keyConditionExpression := "#owner = :owner"
	expressionAttributeNames := map[string]*string{
		"#owner": aws.String("owner"),
	}
	expressionAttributeValues := map[string]*dynamodb.AttributeValue{
		":owner": {
			S: aws.String(owner),
		},
	}

	var filterExpression *string
	if !isOwner {
		filterExpression = aws.String("attribute_not_exists(unlisted) OR #unlisted <> :unlisted")
		expressionAttributeNames["#unlisted"] = aws.String("unlisted")
		expressionAttributeValues[":unlisted"] = &dynamodb.AttributeValue{BOOL: aws.Bool(true)}
	}

	keyConditionExpression = addDates(keyConditionExpression, expressionAttributeNames, expressionAttributeValues, startDate, endDate)

	input := &dynamodb.QueryInput{
		KeyConditionExpression:    aws.String(keyConditionExpression),
		FilterExpression:          filterExpression,
		ExpressionAttributeNames:  expressionAttributeNames,
		ExpressionAttributeValues: expressionAttributeValues,
		ScanIndexForward:          aws.Bool(false),
		IndexName:                 aws.String(gameTableOwnerIndex),
		TableName:                 aws.String(gameTable),
	}

	var games []*Game
	lastKey, err := repo.query(input, startKey, &games)
	if err != nil {
		return nil, "", err
	}
	return games, lastKey, nil
}

type listGamesByPlayerStartKey struct {
	WhiteKey string `json:"whiteKey"`
	BlackKey string `json:"blackKey"`
}

// ListGamesByPlayer returns a list of Games matching the provided player. The PGN text is excluded and must
// be fetched separately with a call to GetGame.
func (repo *dynamoRepository) ListGamesByPlayer(player string, color PlayerColor, startDate, endDate, startKey string) ([]*Game, string, error) {
	player = strings.ToLower(strings.TrimSpace(player))

	startKeys := listGamesByPlayerStartKey{}
	if startKey != "" {
		if err := json.Unmarshal([]byte(startKey), &startKeys); err != nil {
			return nil, "", errors.Wrap(400, "Invalid request: startKey is not valid", "startKey could not be unmarshaled", err)
		}
	}

	lastKeys := listGamesByPlayerStartKey{}
	games := make([]*Game, 0)

	if (color == White || color == Either) && (startKey == "" || startKeys.WhiteKey != "") {
		whiteGames, whiteKey, err := repo.listColorGames(player, White, startDate, endDate, startKeys.WhiteKey)
		if err != nil {
			return nil, "", err
		}
		games = append(games, whiteGames...)
		lastKeys.WhiteKey = whiteKey
	}

	if (color == Black || color == Either) && (startKey == "" || startKeys.BlackKey != "") {
		blackGames, blackKey, err := repo.listColorGames(player, Black, startDate, endDate, startKeys.BlackKey)
		if err != nil {
			return nil, "", err
		}
		games = append(games, blackGames...)
		lastKeys.BlackKey = blackKey
	}

	var lastKey string
	if lastKeys.WhiteKey != "" || lastKeys.BlackKey != "" {
		b, err := json.Marshal(&lastKeys)
		if err != nil {
			return nil, "", errors.Wrap(500, "Temporary server error", "Failed to marshal listGamesByPlayerStartKey", err)
		}
		lastKey = string(b)
	}

	sort.Sort(byDate(games))

	return games, lastKey, nil
}

func (repo *dynamoRepository) listColorGames(player string, color PlayerColor, startDate, endDate, startKey string) ([]*Game, string, error) {
	expressionAttrName := fmt.Sprintf("#%s", color)
	keyConditionExpression := fmt.Sprintf("%s = :player", expressionAttrName)
	expressionAttributeNames := map[string]*string{
		expressionAttrName: aws.String(string(color)),
		"#unlisted":        aws.String("unlisted"),
	}
	expressionAttributeValues := map[string]*dynamodb.AttributeValue{
		":player": {
			S: aws.String(strings.ToLower(player)),
		},
		":unlisted": {
			BOOL: aws.Bool(true),
		},
	}

	keyConditionExpression = addDates(keyConditionExpression, expressionAttributeNames, expressionAttributeValues, startDate, endDate)

	indexName := gameTableWhiteIndex
	if color == Black {
		indexName = gameTableBlackIndex
	}

	input := &dynamodb.QueryInput{
		KeyConditionExpression:    aws.String(keyConditionExpression),
		FilterExpression:          aws.String("attribute_not_exists(unlisted) OR #unlisted <> :unlisted"),
		ExpressionAttributeNames:  expressionAttributeNames,
		ExpressionAttributeValues: expressionAttributeValues,
		ScanIndexForward:          aws.Bool(false),
		IndexName:                 aws.String(indexName),
		TableName:                 aws.String(gameTable),
	}

	var games []*Game
	lastKey, err := repo.query(input, startKey, &games)
	if err != nil {
		return nil, "", err
	}
	return games, lastKey, nil
}

// ListFeaturedGames returns a list of Games featured more recently than the provided date.
func (repo *dynamoRepository) ListFeaturedGames(date, startKey string) ([]*Game, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: aws.String("#f = :true AND #d >= :d"),
		FilterExpression:       aws.String("attribute_not_exists(unlisted) OR #unlisted <> :unlisted"),
		ExpressionAttributeNames: map[string]*string{
			"#f":        aws.String("isFeatured"),
			"#d":        aws.String("featuredAt"),
			"#unlisted": aws.String("unlisted"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":true":     {S: aws.String("true")},
			":d":        {S: aws.String(date)},
			":unlisted": {BOOL: aws.Bool(true)},
		},
		IndexName: aws.String(gameTableFeaturedIndex),
		TableName: aws.String(gameTable),
	}

	var games []*Game
	lastKey, err := repo.query(input, startKey, &games)
	if err != nil {
		return nil, "", err
	}
	return games, lastKey, nil
}

// ListGamesByEco returns a list of Games matching the provided ECO. The PGN text is excluded and must be
// fetched separately with a call to GetGame.
func (repo *dynamoRepository) ListGamesByEco(eco, startDate, endDate, startKey string) ([]*Game, string, error) {
	filterExpression := "#h.#eco = :eco AND (attribute_not_exists(unlisted) OR #unlisted <> :unlisted)"
	expressionAttributeNames := map[string]*string{
		"#h":        aws.String("headers"),
		"#eco":      aws.String("ECO"),
		"#unlisted": aws.String("unlisted"),
	}
	expressionAttributeValues := map[string]*dynamodb.AttributeValue{
		":eco": {
			S: aws.String(eco),
		},
		":unlisted": {
			BOOL: aws.Bool(true),
		},
	}

	filterExpression = addDates(filterExpression, expressionAttributeNames, expressionAttributeValues, startDate, endDate)

	input := &dynamodb.ScanInput{
		FilterExpression:          aws.String(filterExpression),
		ExpressionAttributeNames:  expressionAttributeNames,
		ExpressionAttributeValues: expressionAttributeValues,
		IndexName:                 aws.String(gameTableOwnerIndex),
		TableName:                 aws.String(gameTable),
	}

	var games []*Game
	lastKey, err := repo.scan(input, startKey, &games)
	if err != nil {
		return nil, "", err
	}
	return games, lastKey, nil
}

// ListGamesForReview returns a list of games that have been submitted for review by
// the senseis.
func (repo *dynamoRepository) ListGamesForReview(startKey string) ([]Game, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: aws.String("#rs = :rs"),
		ExpressionAttributeNames: map[string]*string{
			"#rs": aws.String("reviewStatus"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":rs": {S: aws.String(string(GameReviewStatus_Pending))},
		},
		IndexName: aws.String(gameTableReviewIndex),
		TableName: aws.String(gameTable),
	}

	var games []Game
	lastKey, err := repo.query(input, startKey, &games)
	if err != nil {
		return nil, "", err
	}
	return games, lastKey, nil
}

// ScanCohort returns a list of all Games in the provided cohort, including the PGN text.
func (repo *dynamoRepository) ScanCohort(cohort DojoCohort, startKey string) ([]*Game, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: aws.String("#cohort = :cohort"),
		ExpressionAttributeNames: map[string]*string{
			"#cohort": aws.String("cohort"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":cohort": {
				S: aws.String(string(cohort)),
			},
		},
		TableName: aws.String(gameTable),
	}

	var games []*Game
	lastKey, err := repo.query(input, startKey, &games)
	if err != nil {
		return nil, "", err
	}
	return games, lastKey, nil
}

// PutComment puts the provided comment in the provided Game's position comments.
// If skipMapCreation is true, then the first conditional request to create the initial
// comment map for a position is skipped.
func (repo *dynamoRepository) PutComment(cohort, id string, comment *PositionComment, skipMapCreation bool) (*Game, error) {
	item, err := dynamodbattribute.MarshalMap(comment)
	if err != nil {
		return nil, errors.Wrap(400, "Invalid request: comment cannot be marshaled", "", err)
	}

	if len(comment.Replies) == 0 {
		// Hack to work around https://github.com/aws/aws-sdk-go/issues/682
		item["replies"] = &dynamodb.AttributeValue{M: make(map[string]*dynamodb.AttributeValue)}
	}

	var input *dynamodb.UpdateItemInput

	if !skipMapCreation {
		input = &dynamodb.UpdateItemInput{
			ConditionExpression: aws.String("attribute_exists(cohort) AND attribute_not_exists(#p.#fen)"),
			UpdateExpression:    aws.String("SET #p.#fen = :p"),
			ExpressionAttributeNames: map[string]*string{
				"#p":   aws.String("positionComments"),
				"#fen": aws.String(comment.Fen),
			},
			ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
				":p": {
					M: map[string]*dynamodb.AttributeValue{
						comment.Id: {
							M: item,
						},
					},
				},
			},
			Key: map[string]*dynamodb.AttributeValue{
				"cohort": {
					S: aws.String(cohort),
				},
				"id": {
					S: aws.String(id),
				},
			},
			ReturnValues: aws.String("ALL_NEW"),
			TableName:    aws.String(gameTable),
		}

		game := Game{}
		err = repo.updateItem(input, &game)
		if err == nil {
			return &game, nil
		}

		if _, ok := err.(*dynamodb.ConditionalCheckFailedException); !ok {
			return nil, errors.Wrap(500, "Temporary server error", "DynamoDB UpdateItem failure", err)
		}
	}

	// If we made it here, then the game already has a comments map for this fen, and
	// we need to add the new comment to the existing map

	exprAttrNames := map[string]*string{
		"#p":   aws.String("positionComments"),
		"#fen": aws.String(comment.Fen),
		"#id":  aws.String(comment.Id),
	}
	parentPath := getCommentPath(comment.ParentIds, exprAttrNames)

	input = &dynamodb.UpdateItemInput{
		ConditionExpression:      aws.String("attribute_exists(cohort) AND attribute_exists(#p.#fen)"),
		UpdateExpression:         aws.String(fmt.Sprintf("SET #p.#fen.%s#id = :c", parentPath)),
		ExpressionAttributeNames: exprAttrNames,
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":c": {M: item},
		},
		Key: map[string]*dynamodb.AttributeValue{
			"cohort": {
				S: aws.String(cohort),
			},
			"id": {
				S: aws.String(id),
			},
		},
		ReturnValues: aws.String("ALL_NEW"),
		TableName:    aws.String(gameTable),
	}

	game := Game{}
	err = repo.updateItem(input, &game)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(400, "Invalid request: game does not exist", "DynamoDB UpdateItem failure", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB UpdateItem failure", err)
	}
	return &game, nil
}

// UpdateComment applies the given position comment update to the database. The game after update is returned.
func (repo *dynamoRepository) UpdateComment(owner string, update *PositionCommentUpdate) (*Game, error) {
	exprAttrNames := map[string]*string{
		"#p":         aws.String("positionComments"),
		"#fen":       aws.String(update.Fen),
		"#id":        aws.String(update.Id),
		"#owner":     aws.String("owner"),
		"#username":  aws.String("username"),
		"#content":   aws.String("content"),
		"#updated":   aws.String("updatedAt"),
		"#variation": aws.String("suggestedVariation"),
	}
	parentPath := getCommentPath(update.ParentIds, exprAttrNames)
	updateExpr := fmt.Sprintf("SET #p.#fen.%s#id.#content = :c, #p.#fen.%s#id.#variation = :v, #p.#fen.%s#id.#updated = :u", parentPath, parentPath, parentPath)

	input := &dynamodb.UpdateItemInput{
		ConditionExpression:      aws.String(fmt.Sprintf("#p.#fen.%s#id.#owner.#username = :owner", parentPath)),
		UpdateExpression:         aws.String(updateExpr),
		ExpressionAttributeNames: exprAttrNames,
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":owner": {S: aws.String(owner)},
			":c":     {S: aws.String(update.Content)},
			":v":     {S: aws.String(update.SuggestedVariation)},
			":u":     {S: aws.String(time.Now().Format(time.RFC3339))},
		},
		Key: map[string]*dynamodb.AttributeValue{
			"cohort": {
				S: aws.String(string(update.Cohort)),
			},
			"id": {
				S: aws.String(update.GameId),
			},
		},
		ReturnValues: aws.String("ALL_NEW"),
		TableName:    aws.String(gameTable),
	}

	game := Game{}
	err := repo.updateItem(input, &game)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(400, "Invalid request: comment does not exist or you do not have permission to edit it", "DynamoDB UpdateItem failure", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB UpdateItem failure", err)
	}
	return &game, nil
}

// DeleteComment deletes the position comment indicated by the given update, including
// any replies to the comment. The updated game is returned.
func (repo *dynamoRepository) DeleteComment(owner string, update *PositionCommentUpdate) (*Game, error) {
	exprAttrNames := map[string]*string{
		"#p":        aws.String("positionComments"),
		"#fen":      aws.String(update.Fen),
		"#id":       aws.String(update.Id),
		"#owner":    aws.String("owner"),
		"#username": aws.String("username"),
	}
	parentPath := getCommentPath(update.ParentIds, exprAttrNames)

	input := &dynamodb.UpdateItemInput{
		ConditionExpression:      aws.String(fmt.Sprintf("#p.#fen.%s#id.#owner.#username = :owner", parentPath)),
		UpdateExpression:         aws.String(fmt.Sprintf("REMOVE #p.#fen.%s#id", parentPath)),
		ExpressionAttributeNames: exprAttrNames,
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":owner": {S: aws.String(owner)},
		},
		Key: map[string]*dynamodb.AttributeValue{
			"cohort": {
				S: aws.String(string(update.Cohort)),
			},
			"id": {
				S: aws.String(update.GameId),
			},
		},
		ReturnValues: aws.String("ALL_NEW"),
		TableName:    aws.String(gameTable),
	}

	game := Game{}
	err := repo.updateItem(input, &game)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(400, "Invalid request: comment does not exist or you do not have permission to delete it", "DynamoDB UpdateItem failure", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB UpdateItem failure", err)
	}
	return &game, nil
}

// UpdateGame applies the specified update to the specified game.
func (repo *dynamoRepository) UpdateGame(cohort, id string, update *GameUpdate) (*Game, error) {
	av, err := dynamodbattribute.MarshalMap(update)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Unable to marshal user update", err)
	}

	builder := expression.UpdateBuilder{}
	for k, v := range av {
		builder = builder.Set(expression.Name(k), expression.Value(v))
	}

	expr, err := expression.NewBuilder().WithUpdate(builder).Build()
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB expression building error", err)
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"cohort": {
				S: aws.String(cohort),
			},
			"id": {
				S: aws.String(id),
			},
		},
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		UpdateExpression:          expr.Update(),
		ConditionExpression:       aws.String("attribute_exists(id)"),
		TableName:                 aws.String(gameTable),
		ReturnValues:              aws.String("ALL_NEW"),
	}

	game := Game{}
	err = repo.updateItem(input, &game)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(400, "Invalid request: game not found or you do not have permission to update it", "DynamoDB conditional check failed", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB UpdateItem failure", err)
	}
	return &game, nil
}

// Sets the provided game review on the provided game.
func (repo *dynamoRepository) SetGameReview(cohort, id string, review *GameReview) (*Game, error) {
	item, err := dynamodbattribute.MarshalMap(review)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to marshal reviewer", err)
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"cohort": {
				S: aws.String(cohort),
			},
			"id": {
				S: aws.String(id),
			},
		},
		ConditionExpression: aws.String("attribute_exists(id)"),
		UpdateExpression:    aws.String("REMOVE #reviewStatus SET #review = :r"),
		ExpressionAttributeNames: map[string]*string{
			"#reviewStatus": aws.String("reviewStatus"),
			"#review":       aws.String("review"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":r": {M: item},
		},
		ReturnValues: aws.String("ALL_NEW"),
		TableName:    aws.String(gameTable),
	}

	game := Game{}
	err = repo.updateItem(input, &game)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(400, "Invalid request: game not found", "DynamoDB conditional check failed", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "DynamoDB UpdateItem failure", err)
	}
	return &game, nil
}

func getCommentPath(parentIds string, exprAttrNames map[string]*string) string {
	if parentIds == "" {
		return ""
	}

	var parentPath strings.Builder
	parentIdList := strings.Split(parentIds, ",")
	for i, id := range parentIdList {
		parentPath.WriteString(fmt.Sprintf("#parent%d.#replies.", i))
		exprAttrNames[fmt.Sprintf("#parent%d", i)] = aws.String(id)
	}
	if len(parentIdList) > 0 {
		exprAttrNames["#replies"] = aws.String("replies")
	}
	return parentPath.String()
}
