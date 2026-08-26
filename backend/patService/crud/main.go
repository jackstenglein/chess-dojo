// Implements CRUD operations for ChessDojo personal access tokens. All routes
// are authenticated with the standard Cognito JWT authorizer, as tokens can
// only be managed from the website while signed in:
//
//	POST   /user/pat       creates a new token and returns the raw value once
//	GET    /user/pat       lists the current user's tokens (metadata only)
//	DELETE /user/pat/{id}  revokes the token with the given id
package main

import (
	"context"
	"encoding/json"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository database.PersonalAccessTokenManager = database.DynamoDB

const maxNameLength = 100


// CreatePatRequest is the request body for creating a personal access token.
type CreatePatRequest struct {
	// A human-readable name for the token.
	Name string `json:"name"`

	// The scopes granted to the token. Defaults to [read] if empty.
	Scopes []database.PatScope `json:"scopes"`

	// The number of days until the token expires. If zero, the token never
	// expires.
	ExpirationDays int `json:"expirationDays"`
}

// CreatePatResponse is the response body when creating a personal access
// token.
type CreatePatResponse struct {
	// The metadata of the created token.
	Token *database.PersonalAccessToken `json:"token"`

	// The raw token value. This is the only time it is ever returned.
	AccessToken string `json:"accessToken"`
}

// ListPatsResponse is the response body when listing personal access tokens.
type ListPatsResponse struct {
	Tokens []*database.PersonalAccessToken `json:"tokens"`
}

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	switch event.RequestContext.HTTP.Method {
	case "POST":
		return handleCreate(info, event)
	case "GET":
		return handleList(info)
	case "DELETE":
		return handleDelete(info, event)
	}
	return api.Failure(errors.New(405, "Invalid request: method not allowed", "")), nil
}

func handleCreate(info *api.UserInfo, event api.Request) (api.Response, error) {
	request := &CreatePatRequest{}
	if err := json.Unmarshal([]byte(event.Body), request); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: unable to unmarshal request body", "", err)), nil
	}

	if request.Name == "" {
		return api.Failure(errors.New(400, "Invalid request: name is required", "")), nil
	}
	if len(request.Name) > maxNameLength {
		return api.Failure(errors.New(400, "Invalid request: name is too long", "")), nil
	}
	if request.ExpirationDays < 0 {
		return api.Failure(errors.New(400, "Invalid request: expirationDays is invalid", "")), nil
	}

	scopes := request.Scopes
	if len(scopes) == 0 {
		scopes = []database.PatScope{database.PatScopeRead}
	}
	for _, scope := range scopes {
		if scope != database.PatScopeRead && scope != database.PatScopeWrite {
			return api.Failure(errors.New(400, "Invalid request: unknown scope", "")), nil
		}
	}

	expiresAt := ""
	if request.ExpirationDays > 0 {
		expiresAt = time.Now().AddDate(0, 0, request.ExpirationDays).Format(time.RFC3339)
	}

	pat, rawToken, err := database.NewPat(info.Username, info.Email, request.Name, scopes, expiresAt)
	if err != nil {
		return api.Failure(err), nil
	}

	if err := repository.CreatePat(pat); err != nil {
		return api.Failure(err), nil
	}

	return api.Success(&CreatePatResponse{Token: pat, AccessToken: rawToken}), nil
}

func handleList(info *api.UserInfo) (api.Response, error) {
	pats, err := repository.ListPats(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}
	if pats == nil {
		pats = []*database.PersonalAccessToken{}
	}
	return api.Success(&ListPatsResponse{Tokens: pats}), nil
}

func handleDelete(info *api.UserInfo, event api.Request) (api.Response, error) {
	id := event.PathParameters["id"]
	if id == "" {
		return api.Failure(errors.New(400, "Invalid request: id is required", "")), nil
	}

	if err := repository.DeletePat(info.Username, id); err != nil {
		return api.Failure(err), nil
	}
	return api.Success(nil), nil
}
