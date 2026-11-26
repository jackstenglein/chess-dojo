package database

import (
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
)

type TournamentType string

const (
	TournamentType_Swiss TournamentType = "SWISS"
	TournamentType_Arena TournamentType = "ARENA"
)

type TournamentSite string

const (
	TournamentSite_Lichess  TournamentSite = "LICHESS"
	TournamentSite_Chesscom TournamentSite = "CHESSCOM"
)

type LeaderboardType string

const (
	LeaderboardType_OpenClassical LeaderboardType = "OPEN_CLASSICAL"
)

type LeaderboardSite string

const (
	LeaderboardSite_Lichess  LeaderboardSite = "lichess.org"
	LeaderboardSite_Chesscom LeaderboardSite = "chess.com"
)

const CurrentLeaderboard = "CURRENT"

var LeaderboardSites = []LeaderboardSite{
	LeaderboardSite_Lichess,
	LeaderboardSite_Chesscom,
}

var LeaderboardNames = []LeaderboardType{
	"ARENA",
	"SWISS",
	"GRAND_PRIX",
	"MIDDLEGAME_SPARRING",
	"ENDGAME_SPARRING",
}

var TimeControls = []string{
	"BLITZ",
	"RAPID",
	"CLASSICAL",
}

// LeaderboardPlayer represents a single player in the tournament leaderboards.
type LeaderboardPlayer struct {
	// The Lichess or Chess.com username of the player.
	Username string `dynamodbav:"username" json:"username"`

	// The Lichess or Chess.com rating of the player.
	Rating int `dynamodbav:"rating" json:"rating"`

	// The score of the player in the given leaderboard.
	Score float32 `dynamodbav:"score" json:"score"`
}

type Leaderboard struct {
	// The type of the leaderboard and the hash key of the table. Follows this format:
	// LEADERBOARD(_CHESSCOM)_(MONTHLY|YEARLY)_(ARENA|SWISS|GRAND_PRIX|MIDDLEGAME_SPARRING|ENDGAME_SPARRING)_(BLITZ|RAPID|CLASSICAL)
	Type LeaderboardType `dynamodbav:"type" json:"type"`

	// The start of the period the leaderboard applies to and the range key of the table.
	// For the current leaderboard, this is set to the value of CurrentLeaderboard.
	StartsAt string `dynamodbav:"startsAt" json:"startsAt"`

	// The site that the leaderboard applies to
	Site LeaderboardSite `dynamodbav:"site" json:"site"`

	// The time control of the leaderboard. Valid values are blitz, rapid and classical.
	TimeControl string `dynamodbav:"timeControl" json:"timeControl"`

	// The players in the leaderboard, sorted by their score.
	Players []LeaderboardPlayer `dynamodbav:"players" json:"players"`
}

// SetLeaderboard inserts the provided leaderboard into the database.
func (repo *dynamoRepository) SetLeaderboard(leaderboard Leaderboard) error {
	item, err := dynamodbattribute.MarshalMap(leaderboard)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Unable to marshal leaderboard", err)
	}

	input := &dynamodb.PutItemInput{
		Item:      item,
		TableName: new(tournamentTable),
	}
	_, err = repo.svc.PutItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed DynamoDB PutItem request", err)
}

// GetLeaderboard fetches the leaderboard with the provided values.
func (repo *dynamoRepository) GetLeaderboard(site LeaderboardSite, timePeriod, tournamentType, timeControl, startsAt string) (*Leaderboard, error) {
	var sitePrefix string
	if site == LeaderboardSite_Chesscom {
		sitePrefix = "_CHESSCOM"
	}

	timePeriod = strings.ToUpper(timePeriod)
	tournamentType = strings.ToUpper(tournamentType)
	timeControl = strings.ToUpper(timeControl)

	leaderboardType := fmt.Sprintf("LEADERBOARD%s_%s_%s_%s", sitePrefix, timePeriod, tournamentType, timeControl)
	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type": {
				S: new(leaderboardType),
			},
			"startsAt": {
				S: new(startsAt),
			},
		},
		TableName: new(tournamentTable),
	}

	leaderboard := Leaderboard{
		Type:        LeaderboardType(leaderboardType),
		StartsAt:    startsAt,
		Site:        site,
		TimeControl: timeControl,
	}
	err := repo.getItem(input, &leaderboard)
	return &leaderboard, err
}

// OpenClassical represents an Open Classical tournament.
type OpenClassical struct {
	// The hash key of the tournaments table. Regular tournaments have a complicated
	// structure, but for Open Classicals, this is just the value OPEN_CLASSICAL
	Type LeaderboardType `dynamodbav:"type" json:"type"`

	// The start of the period the tournament applies to and the range key of the table.
	// For the current Open Classical, this is set to the value of CurrentLeaderboard.
	StartsAt string `dynamodbav:"startsAt" json:"startsAt"`

	// The name of a completed tournament. This attribute is only present on completed
	// open classicals.
	Name string `dynamodbav:"name,omitempty" json:"name"`

	// Whether the open classical is accepting registrations or not.
	AcceptingRegistrations bool `dynamodbav:"acceptingRegistrations" json:"acceptingRegistrations"`

	// The sections in the tournament
	Sections map[string]OpenClassicalSection `dynamodbav:"sections" json:"sections"`

	// Players who are not in good standing and cannot register, mapped by their Dojo username.
	BannedPlayers map[string]OpenClassicalPlayer `dynamodbav:"bannedPlayers" json:"bannedPlayers"`

	// The month that the tournament started, in ISO format. Empty for tournaments still
	// accepting registrations.
	StartMonth string `dynamodbav:"startMonth" json:"-"`

	// The date that registrations will close. Empty for tournaments that are already closed.
	RegistrationClose string `dynamodbav:"registrationClose,omitempty" json:"registrationClose"`
}

// A section in the Open Classical tournament. Generally consists of both a region and a rating range.
type OpenClassicalSection struct {
	// The name of the section.
	Name string `dynamodbav:"name" json:"name"`

	// The region of the section.
	Region string `dynamodbav:"region" json:"region"`

	// The rating section of the section.
	Section string `dynamodbav:"section" json:"section"`

	// The players in the section, mapped by their Dojo username.
	Players map[string]OpenClassicalPlayer `dynamodbav:"players" json:"players"`

	// The rounds in the tournament for this section.
	Rounds []OpenClassicalRound `dynamodbav:"rounds" json:"rounds"`
}

// OpenClassicalRound represents a single round in the Open Classical tournaments.
type OpenClassicalRound struct {
	// Whether emails for the pairings were sent
	PairingEmailsSent bool `dynamodbav:"pairingEmailsSent" json:"pairingEmailsSent"`

	// The list of pairings for the round
	Pairings []OpenClassicalPairing `dynamodbav:"pairings" json:"pairings"`
}

// OpenClassicalPairing represents a single pairing in the Open Classical tournaments,
// which are separate from the regular leaderboards.
type OpenClassicalPairing struct {
	// The player with the white pieces
	White OpenClassicalPlayerSummary `dynamodbav:"white" json:"white"`

	// The player with the black pieces
	Black OpenClassicalPlayerSummary `dynamodbav:"black" json:"black"`

	// The result of the game
	Result string `dynamodbav:"result" json:"result"`

	// The URL of the game that was played
	GameUrl string `dynamodbav:"gameUrl" json:"gameUrl"`

	// Whether the result is verified
	Verified bool `dynamodbav:"verified" json:"verified"`

	// Whether to report the opponent for failure to schedule or show up
	ReportOpponent bool `dynamodbav:"reportOpponent,omitempty" json:"reportOpponent"`

	// The notes included by the submitter when submitting
	Notes string `dynamodbav:"notes,omitempty" json:"notes"`

	// The S3 keys of screenshots submitted as proof of the result
	Screenshots []string `dynamodbav:"screenshots,omitempty" json:"screenshots,omitempty"`
}

// OpenClassicalPlayerSummary represents the minimum information needed to schedule
// a game with a player in the Open Classical.
type OpenClassicalPlayerSummary struct {
	// The Dojo username of the player
	Username string `dynamodbav:"username" json:"username"`

	// The display name of the player
	DisplayName string `dynamodbav:"displayName" json:"displayName"`

	// The Lichess username of the player
	LichessUsername string `dynamodbav:"lichessUsername" json:"lichessUsername"`

	// The Discord username of the player
	DiscordUsername string `dynamodbav:"discordUsername" json:"discordUsername"`

	// The Discord ID of the player
	DiscordId string `dynamodbav:"discordId" json:"discordId"`

	// The player's title, if they have one
	Title string `dynamodbav:"title" json:"title"`

	// The player's Lichess rating at the start of the Open Classical
	Rating int `dynamodbav:"rating" json:"rating"`
}

// OpenClassicalPlayer represents a player in the Open Classical tournaments, which
// are separate from the regular tournaments. As opposed to the OpenClassicalPlayerSummary,
// this type contains the player's full registration information.
type OpenClassicalPlayer struct {
	OpenClassicalPlayerSummary

	// The email of the player
	Email string `dynamodbav:"email" json:"-"`

	// The region the player is in
	Region string `dynamodbav:"region" json:"region"`

	// The section the player is in
	Section string `dynamodbav:"section" json:"section"`

	// The player's bye requests
	ByeRequests []bool `dynamodbav:"byeRequests" json:"byeRequests"`

	// The status of the player in this Open Classical
	Status OpenClassicalPlayerStatus `dynamodbav:"status,omitempty" json:"status"`

	// The last round the player was active in the tournament, if they are banned or withdrawn
	LastActiveRound int `dynamodbav:"lastActiveRound,omitempty" json:"lastActiveRound"`
}

type OpenClassicalPlayerStatus string

const (
	OpenClassicalPlayerStatus_Banned    OpenClassicalPlayerStatus = "BANNED"
	OpenClassicalPlayerStatus_Withdrawn OpenClassicalPlayerStatus = "WITHDRAWN"
)

type OpenClassicalPairingUpdate struct {
	Region            string
	Section           string
	Round             int
	PairingIndex      int
	OverwriteVerified bool
	Pairing           *OpenClassicalPairing
}

// SetOpenClassical inserts the provided OpenClassical into the database.
func (repo *dynamoRepository) SetOpenClassical(openClassical *OpenClassical) error {
	encoder := dynamodbattribute.NewEncoder()
	encoder.EnableEmptyCollections = true

	openClassical.Type = LeaderboardType_OpenClassical
	item, err := encoder.Encode(openClassical)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Unable to marshall open classical", err)
	}

	input := &dynamodb.PutItemInput{
		Item:      item.M,
		TableName: new(tournamentTable),
	}
	_, err = repo.svc.PutItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed DynamoDB PutItem request", err)
}

// GetOpenClassical returns the open classical for the provided startsAt period.
func (repo *dynamoRepository) GetOpenClassical(startsAt string) (*OpenClassical, error) {
	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type": {
				S: new(string(LeaderboardType_OpenClassical)),
			},
			"startsAt": {
				S: new(startsAt),
			},
		},
		TableName: new(tournamentTable),
	}

	openClassical := OpenClassical{}
	err := repo.getItem(input, &openClassical)
	return &openClassical, err
}

// UpdateOpenClassicalRegistration adds the provided player to the given open classical. If the player
// already exists in a different section, they are removed.
func (repo *dynamoRepository) UpdateOpenClassicalRegistration(openClassical *OpenClassical, player *OpenClassicalPlayer) (*OpenClassical, error) {
	item, err := dynamodbattribute.MarshalMap(player)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Unable to marshal open classical player", err)
	}

	updateExpr := "REMOVE "
	exprAttrNames := map[string]*string{
		"#acceptingRegistrations": new("acceptingRegistrations"),
		"#sections":               new("sections"),
		"#players":                new("players"),
		"#username":               new(player.Username),
	}

	for key, section := range openClassical.Sections {
		if section.Region != player.Region || section.Section != player.Section {
			sectionName := fmt.Sprintf("#%s", key)
			updateExpr += fmt.Sprintf("#sections.%s.#players.#username, ", sectionName)
			exprAttrNames[sectionName] = new(key)
		}
	}
	updateExpr = updateExpr[0 : len(updateExpr)-2]

	sectionName := fmt.Sprintf("#%s_%s", player.Region, player.Section)
	updateExpr += fmt.Sprintf(" SET #sections.%s.#players.#username = :player", sectionName)
	exprAttrNames[sectionName] = new(fmt.Sprintf("%s_%s", player.Region, player.Section))

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type": {
				S: new(string(openClassical.Type)),
			},
			"startsAt": {
				S: new(openClassical.StartsAt),
			},
		},
		UpdateExpression:         new(updateExpr),
		ConditionExpression:      new("#acceptingRegistrations = :true"),
		ExpressionAttributeNames: exprAttrNames,
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":player": {M: item},
			":true":   {BOOL: new(true)},
		},
		TableName:    new(tournamentTable),
		ReturnValues: new("ALL_NEW"),
	}

	result, err := repo.svc.UpdateItem(input)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(400, "Registration for this tournament has already closed", "DynamoDB conditional check failed", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem", err)
	}

	resultTnmt := OpenClassical{}
	if err := dynamodbattribute.UnmarshalMap(result.Attributes, &resultTnmt); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal UpdateItem result", err)
	}
	return &resultTnmt, nil
}

// ListPreviousOpenClassicals returns a list of OpenClassicals whose name is not CURRENT.
// The list is sorted in descending order by name.
func (repo *dynamoRepository) ListPreviousOpenClassicals(startKey string) ([]OpenClassical, string, error) {
	input := dynamodb.QueryInput{
		KeyConditionExpression: new("#type = :openClassical"),
		ExpressionAttributeNames: map[string]*string{
			"#type": new("type"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":openClassical": {S: new("OPEN_CLASSICAL")},
		},
		IndexName:        new(tournamentTableOpenClassicalIndex),
		TableName:        new(tournamentTable),
		ScanIndexForward: new(false),
	}

	var openClassicals []OpenClassical
	lastKey, err := repo.query(&input, startKey, &openClassicals)
	if err != nil {
		return nil, "", err
	}
	return openClassicals, lastKey, nil
}

// Sets the pairing on the current open classical to match the given update. The update succeeds
// only if the pairing is not already marked as verified.
func (repo *dynamoRepository) UpdateOpenClassicalResult(update *OpenClassicalPairingUpdate) (*OpenClassical, error) {
	item, err := dynamodbattribute.MarshalMap(update.Pairing)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Unable to marshal open classical pairing", err)
	}

	sectionName := fmt.Sprintf("#%s_%s", update.Region, update.Section)
	pairingPath := fmt.Sprintf("#sections.%s.#rounds[%d].#pairings[%d]", sectionName, update.Round, update.PairingIndex)

	updateExpr := fmt.Sprintf("SET %s = :item", pairingPath)
	exprAttrNames := map[string]*string{
		"#sections": new("sections"),
		sectionName: new(fmt.Sprintf("%s_%s", update.Region, update.Section)),
		"#rounds":   new("rounds"),
		"#pairings": new("pairings"),
	}
	exprAttrValues := map[string]*dynamodb.AttributeValue{
		":item": {M: item},
	}

	conditionExpr := fmt.Sprintf("attribute_exists(%s)", pairingPath)
	if !update.OverwriteVerified {
		conditionExpr += fmt.Sprintf(" AND %s.#verified <> :true", pairingPath)
		exprAttrNames["#verified"] = new("verified")
		exprAttrValues[":true"] = &dynamodb.AttributeValue{BOOL: new(true)}
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type":     {S: new(string(LeaderboardType_OpenClassical))},
			"startsAt": {S: new(string(CurrentLeaderboard))},
		},
		UpdateExpression:          new(updateExpr),
		ConditionExpression:       new(conditionExpr),
		ExpressionAttributeNames:  exprAttrNames,
		ExpressionAttributeValues: exprAttrValues,
		TableName:                 new(tournamentTable),
		ReturnValues:              new("ALL_NEW"),
	}

	result, err := repo.svc.UpdateItem(input)
	if err != nil {
		if aerr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(400, "This pairing does not exist or its result has already been verified. Contact the TD to change it.", "DynamoDB conditional check failed", aerr)
		}
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem", err)
	}

	resultTnmt := OpenClassical{}
	if err := dynamodbattribute.UnmarshalMap(result.Attributes, &resultTnmt); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal UpdateItem result", err)
	}
	return &resultTnmt, nil
}

// Sets the pairing emails sent flag to true for all sections in the current open classical.
// Round is a 1-based index.
func (repo *dynamoRepository) SetPairingEmailsSent(openClassical *OpenClassical, round int) (*OpenClassical, error) {
	exprAttrNames := map[string]*string{
		"#sections": new("sections"),
		"#rounds":   new("rounds"),
		"#emails":   new("pairingEmailsSent"),
	}

	updateExpr := "SET "
	for key := range openClassical.Sections {
		sectionName := fmt.Sprintf("#%s", key)
		updateExpr += fmt.Sprintf("#sections.%s.#rounds[%d].#emails = :true, ", sectionName, round-1)
		exprAttrNames[sectionName] = new(key)
	}
	updateExpr = updateExpr[0 : len(updateExpr)-2]

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type":     {S: new(string(openClassical.Type))},
			"startsAt": {S: new(openClassical.StartsAt)},
		},
		UpdateExpression:         new(updateExpr),
		ExpressionAttributeNames: exprAttrNames,
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":true": {BOOL: new(true)},
		},
		TableName:    new(tournamentTable),
		ReturnValues: new("ALL_NEW"),
	}
	log.Debugf("Input: %#v", input)

	result := &OpenClassical{}
	if err := repo.updateItem(input, result); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem", err)
	}
	return result, nil
}

// Bans the given player in the current open classical.
func (repo *dynamoRepository) BanPlayer(player *OpenClassicalPlayer) (*OpenClassical, error) {
	item, err := dynamodbattribute.MarshalMap(player)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to marshal player", err)
	}

	updateExpr := "SET #bannedPlayers.#username = :item, #sections.#sectionName.#players.#username = :item"
	exprAttrNames := map[string]*string{
		"#bannedPlayers": new("bannedPlayers"),
		"#username":      new(player.Username),
		"#sections":      new("sections"),
		"#sectionName":   new(fmt.Sprintf("%s_%s", player.Region, player.Section)),
		"#players":       new("players"),
	}
	exprAttrValues := map[string]*dynamodb.AttributeValue{
		":item": {M: item},
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type":     {S: new(string(LeaderboardType_OpenClassical))},
			"startsAt": {S: new(CurrentLeaderboard)},
		},
		UpdateExpression:          new(updateExpr),
		ExpressionAttributeNames:  exprAttrNames,
		ExpressionAttributeValues: exprAttrValues,
		TableName:                 new(tournamentTable),
		ReturnValues:              new("ALL_NEW"),
	}

	result := &OpenClassical{}
	if err := repo.updateItem(input, result); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem call", err)
	}
	return result, nil
}

// Unbans the given player in the current open classical.
func (repo *dynamoRepository) UnbanPlayer(username string) (*OpenClassical, error) {
	updateExpr := "REMOVE #bannedPlayers.#username"
	exprAttrNames := map[string]*string{
		"#bannedPlayers": new("bannedPlayers"),
		"#username":      new(username),
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type":     {S: new(string(LeaderboardType_OpenClassical))},
			"startsAt": {S: new(CurrentLeaderboard)},
		},
		UpdateExpression:         new(updateExpr),
		ExpressionAttributeNames: exprAttrNames,
		TableName:                new(tournamentTable),
		ReturnValues:             new("ALL_NEW"),
	}

	result := &OpenClassical{}
	if err := repo.updateItem(input, result); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem call", err)
	}
	return result, nil
}

// Sets a player in the current open classical. The player must already exist in the given
// region and section.
func (repo *dynamoRepository) SetPlayer(player *OpenClassicalPlayer) (*OpenClassical, error) {
	item, err := dynamodbattribute.MarshalMap(player)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to marshal player", err)
	}

	updateExpr := "SET #sections.#sectionName.#players.#username = :item"
	exprAttrNames := map[string]*string{
		"#sections":    new("sections"),
		"#sectionName": new(fmt.Sprintf("%s_%s", player.Region, player.Section)),
		"#players":     new("players"),
		"#username":    new(player.Username),
	}
	exprAttrValues := map[string]*dynamodb.AttributeValue{
		":item": {M: item},
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type":     {S: new(string(LeaderboardType_OpenClassical))},
			"startsAt": {S: new(CurrentLeaderboard)},
		},
		ConditionExpression:       new("attribute_exists(#sections.#sectionName.#players.#username)"),
		UpdateExpression:          new(updateExpr),
		ExpressionAttributeNames:  exprAttrNames,
		ExpressionAttributeValues: exprAttrValues,
		TableName:                 new(tournamentTable),
		ReturnValues:              new("ALL_NEW"),
	}

	result := &OpenClassical{}
	if err := repo.updateItem(input, result); err != nil {
		if _, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			return nil, errors.Wrap(404, "Invalid request: player does not exist", "DynamoDB conditional check failed", err)
		}
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem call", err)
	}
	return result, nil
}

// Closes registrations for the current open classical.
func (repo *dynamoRepository) OpenClassicalCloseRegistrations() (*OpenClassical, error) {
	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type":     {S: new(string(LeaderboardType_OpenClassical))},
			"startsAt": {S: new(CurrentLeaderboard)},
		},
		UpdateExpression: new("SET #acceptingRegistrations = :false, #startMonth = :startMonth REMOVE #registrationClose"),
		ExpressionAttributeNames: map[string]*string{
			"#acceptingRegistrations": new("acceptingRegistrations"),
			"#startMonth":             new("startMonth"),
			"#registrationClose":      new("registrationClose"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":false":      {BOOL: new(false)},
			":startMonth": {S: new(time.Now().Format("2006-01"))},
		},
		TableName:    new(tournamentTable),
		ReturnValues: new("ALL_NEW"),
	}

	result := &OpenClassical{}
	if err := repo.updateItem(input, result); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem call", err)
	}
	return result, nil
}

// Adds a new round to the given region and section of the current open classical, using the
// provided pairings.
func (repo *dynamoRepository) OpenClassicalAddRound(region, section string, pairings []OpenClassicalPairing) (*OpenClassical, error) {
	round := OpenClassicalRound{
		PairingEmailsSent: false,
		Pairings:          pairings,
	}
	item, err := dynamodbattribute.MarshalMap(round)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to marshal round", err)
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type":     {S: new(string(LeaderboardType_OpenClassical))},
			"startsAt": {S: new(CurrentLeaderboard)},
		},
		UpdateExpression: new("SET #sections.#s.#rounds = list_append(if_not_exists(#sections.#s.#rounds, :empty_list), :r)"),
		ExpressionAttributeNames: map[string]*string{
			"#sections": new("sections"),
			"#s":        new(fmt.Sprintf("%s_%s", region, section)),
			"#rounds":   new("rounds"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":empty_list": {L: []*dynamodb.AttributeValue{}},
			":r":          {L: []*dynamodb.AttributeValue{{M: item}}},
		},
		TableName:    new(tournamentTable),
		ReturnValues: new("ALL_NEW"),
	}

	result := &OpenClassical{}
	if err := repo.updateItem(input, result); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem call", err)
	}
	return result, nil
}

// Sets the pairings in the given round for current open classical.
func (repo *dynamoRepository) OpenClassicalSetRound(region, section string, round int, pairings []OpenClassicalPairing) (*OpenClassical, error) {
	list, err := dynamodbattribute.MarshalList(pairings)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to marshal pairings", err)
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"type":     {S: new(string(LeaderboardType_OpenClassical))},
			"startsAt": {S: new(CurrentLeaderboard)},
		},
		UpdateExpression: new(fmt.Sprintf("SET #sections.#s.#rounds[%d].#pairings = :pairings", round)),
		ExpressionAttributeNames: map[string]*string{
			"#sections": new("sections"),
			"#s":        new(fmt.Sprintf("%s_%s", region, section)),
			"#rounds":   new("rounds"),
			"#pairings": new("pairings"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":pairings": {L: list},
		},
		TableName:    new(tournamentTable),
		ReturnValues: new("ALL_NEW"),
	}

	result := &OpenClassical{}
	if err := repo.updateItem(input, result); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem call", err)
	}
	return result, nil
}
