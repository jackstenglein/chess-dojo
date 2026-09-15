package database

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/google/uuid"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

var patTable = stage + "-personal-access-tokens"

const patTableUsernameIndex = "UsernameIdx"

// PatTokenPrefix is the prefix of all ChessDojo personal access tokens.
const PatTokenPrefix = "dojo_pat_"

// MaxPatsPerUser is the maximum number of active personal access tokens a
// single user can have.
const MaxPatsPerUser = 10

// PatScope indicates the level of access granted by a personal access token.
type PatScope string

const (
	// PatScopeRead grants read-only access (GET requests).
	PatScopeRead PatScope = "read"
	// PatScopeWrite grants write access (POST/PUT/DELETE requests).
	PatScopeWrite PatScope = "write"
)

// PersonalAccessToken represents a long-lived API token that third-party
// integrations (Eg: MCP servers) can use to call the ChessDojo API on behalf
// of a user. The raw token value is never stored; only its SHA-256 hash.
type PersonalAccessToken struct {
	// The SHA-256 hash (hex-encoded) of the raw token. This is the hash key
	// of the table and is never returned to clients.
	TokenHash string `dynamodbav:"tokenHash" json:"-"`

	// A random UUID identifying this token. Used by clients to revoke tokens.
	Id string `dynamodbav:"id" json:"id"`

	// The username of the user that owns this token.
	Username string `dynamodbav:"username" json:"-"`

	// The email of the user that owns this token.
	Email string `dynamodbav:"email,omitempty" json:"-"`

	// A human-readable name for the token (Eg: `ChessAgine MCP`).
	Name string `dynamodbav:"name" json:"name"`

	// The first characters of the raw token (Eg: `dojo_pat_AbC1`), displayed
	// in the UI so users can identify tokens.
	DisplayPrefix string `dynamodbav:"displayPrefix" json:"displayPrefix"`

	// The scopes granted to this token.
	Scopes []PatScope `dynamodbav:"scopes" json:"scopes"`

	// The date the token was created, in ISO 8601.
	CreatedAt string `dynamodbav:"createdAt" json:"createdAt"`

	// The date the token expires, in ISO 8601. If empty, the token never
	// expires.
	ExpiresAt string `dynamodbav:"expiresAt,omitempty" json:"expiresAt,omitempty"`

	// The date the token was last used to authenticate, in ISO 8601.
	LastUsedAt string `dynamodbav:"lastUsedAt,omitempty" json:"lastUsedAt,omitempty"`
}

// IsExpired returns true if the token has an expiration date in the past.
func (pat *PersonalAccessToken) IsExpired() bool {
	if pat.ExpiresAt == "" {
		return false
	}
	expiresAt, err := time.Parse(time.RFC3339, pat.ExpiresAt)
	if err != nil {
		return true
	}
	return time.Now().After(expiresAt)
}

// HasScope returns true if the token grants the provided scope.
func (pat *PersonalAccessToken) HasScope(scope PatScope) bool {
	for _, s := range pat.Scopes {
		if s == scope {
			return true
		}
	}
	return false
}

// HashPatToken returns the hex-encoded SHA-256 hash of the provided raw token.
func HashPatToken(rawToken string) string {
	hash := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(hash[:])
}

// GeneratePatToken generates a new cryptographically-random raw token value.
func GeneratePatToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", errors.Wrap(500, "Temporary server error", "Failed to generate random token", err)
	}
	return PatTokenPrefix + base64.RawURLEncoding.EncodeToString(buf), nil
}

// PersonalAccessTokenManager provides an interface for managing personal
// access tokens in the database.
type PersonalAccessTokenManager interface {
	// CreatePat saves the provided token in the database. It returns a 400
	// error if the user already has MaxPatsPerUser tokens.
	CreatePat(pat *PersonalAccessToken) error

	// GetPatByHash returns the token with the provided hash.
	GetPatByHash(tokenHash string) (*PersonalAccessToken, error)

	// ListPats returns all tokens owned by the provided username.
	ListPats(username string) ([]*PersonalAccessToken, error)

	// DeletePat deletes the token with the provided id, if it is owned by the
	// provided username.
	DeletePat(username, id string) error

	// UpdatePatLastUsed sets the lastUsedAt field of the token with the
	// provided hash.
	UpdatePatLastUsed(tokenHash string) error
}

// NewPat creates (but does not save) a new PersonalAccessToken for the given
// user. It returns the token object and the raw token value, which is shown
// to the user exactly once and never stored.
func NewPat(username, email, name string, scopes []PatScope, expiresAt string) (*PersonalAccessToken, string, error) {
	rawToken, err := GeneratePatToken()
	if err != nil {
		return nil, "", err
	}

	displayPrefix := rawToken
	if len(displayPrefix) > len(PatTokenPrefix)+4 {
		displayPrefix = displayPrefix[:len(PatTokenPrefix)+4]
	}

	pat := &PersonalAccessToken{
		TokenHash:     HashPatToken(rawToken),
		Id:            uuid.NewString(),
		Username:      username,
		Email:         email,
		Name:          name,
		DisplayPrefix: displayPrefix,
		Scopes:        scopes,
		CreatedAt:     time.Now().Format(time.RFC3339),
		ExpiresAt:     expiresAt,
	}
	return pat, rawToken, nil
}

// CreatePat saves the provided token in the database. It returns a 400 error
// if the user already has MaxPatsPerUser tokens.
func (repo *dynamoRepository) CreatePat(pat *PersonalAccessToken) error {
	existing, err := repo.ListPats(pat.Username)
	if err != nil {
		return err
	}
	if len(existing) >= MaxPatsPerUser {
		return errors.New(400, fmt.Sprintf("Invalid request: you already have the maximum number of access tokens (%d). Delete an existing token first.", MaxPatsPerUser), "")
	}

	item, err := dynamodbattribute.MarshalMap(pat)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Unable to marshal personal access token", err)
	}

	input := &dynamodb.PutItemInput{
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(tokenHash)"),
		TableName:           aws.String(patTable),
	}
	_, err = repo.svc.PutItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed DynamoDB PutItem call", err)
}

// GetPatByHash returns the token with the provided hash.
func (repo *dynamoRepository) GetPatByHash(tokenHash string) (*PersonalAccessToken, error) {
	input := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"tokenHash": {S: aws.String(tokenHash)},
		},
		TableName: aws.String(patTable),
	}

	pat := PersonalAccessToken{}
	if err := repo.getItem(input, &pat); err != nil {
		return nil, err
	}
	return &pat, nil
}

// ListPats returns all tokens owned by the provided username.
func (repo *dynamoRepository) ListPats(username string) ([]*PersonalAccessToken, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: aws.String("#username = :username"),
		ExpressionAttributeNames: map[string]*string{
			"#username": aws.String("username"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":username": {S: aws.String(username)},
		},
		IndexName: aws.String(patTableUsernameIndex),
		TableName: aws.String(patTable),
	}

	var pats []*PersonalAccessToken
	_, err := repo.query(input, "", &pats)
	if err != nil {
		return nil, err
	}
	return pats, nil
}

// DeletePat deletes the token with the provided id, if it is owned by the
// provided username.
func (repo *dynamoRepository) DeletePat(username, id string) error {
	pats, err := repo.ListPats(username)
	if err != nil {
		return err
	}

	for _, pat := range pats {
		if pat.Id != id {
			continue
		}

		input := &dynamodb.DeleteItemInput{
			Key: map[string]*dynamodb.AttributeValue{
				"tokenHash": {S: aws.String(pat.TokenHash)},
			},
			ConditionExpression: aws.String("username = :username"),
			ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
				":username": {S: aws.String(username)},
			},
			TableName: aws.String(patTable),
		}
		_, err := repo.svc.DeleteItem(input)
		return errors.Wrap(500, "Temporary server error", "Failed DynamoDB DeleteItem call", err)
	}

	return errors.New(404, "Invalid request: access token not found", "")
}

// UpdatePatLastUsed sets the lastUsedAt field of the token with the provided
// hash.
func (repo *dynamoRepository) UpdatePatLastUsed(tokenHash string) error {
	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"tokenHash": {S: aws.String(tokenHash)},
		},
		ConditionExpression: aws.String("attribute_exists(tokenHash)"),
		UpdateExpression:    aws.String("SET lastUsedAt = :lastUsedAt"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":lastUsedAt": {S: aws.String(time.Now().Format(time.RFC3339))},
		},
		TableName: aws.String(patTable),
	}
	_, err := repo.svc.UpdateItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed DynamoDB UpdateItem call", err)
}
