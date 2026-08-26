// Implements an API Gateway HTTP API Lambda authorizer that authenticates
// requests using ChessDojo personal access tokens. Routes protected by this
// authorizer can be called by third-party integrations (Eg: the ChessAgine
// MCP server) using a token generated in the user's profile settings.
//
// The authorizer expects the raw token in the Authorization header, either
// bare or with a `Bearer ` prefix. On success, it forwards the token owner's
// username/email/name in the authorizer context, where api.GetUserInfo picks
// them up, so downstream handlers behave exactly as they do with Cognito JWT
// authentication.
package main

import (
	"context"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository database.PersonalAccessTokenManager = database.DynamoDB

func main() {
	lambda.Start(Handler)
}

var deny events.APIGatewayV2CustomAuthorizerSimpleResponse = events.APIGatewayV2CustomAuthorizerSimpleResponse{IsAuthorized: false}

func Handler(ctx context.Context, event events.APIGatewayV2CustomAuthorizerV2Request) (events.APIGatewayV2CustomAuthorizerSimpleResponse, error) {
	log.SetRequestId(event.RequestContext.RequestID)

	authHeader := event.Headers["authorization"]
	if authHeader == "" {
		authHeader = event.Headers["Authorization"]
	}
	rawToken := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(authHeader), "Bearer "))
	if !strings.HasPrefix(rawToken, database.PatTokenPrefix) {
		log.Debug("Authorization header is missing or is not a personal access token")
		return deny, nil
	}

	pat, err := repository.GetPatByHash(database.HashPatToken(rawToken))
	if err != nil {
		log.Debug("Failed to find personal access token: ", err)
		return deny, nil
	}

	if pat.IsExpired() {
		log.Debugf("Personal access token %s is expired", pat.Id)
		return deny, nil
	}

	requiredScope := database.PatScopeWrite
	if event.RequestContext.HTTP.Method == "GET" {
		requiredScope = database.PatScopeRead
	}
	if !pat.HasScope(requiredScope) {
		log.Debugf("Personal access token %s does not have required scope %s", pat.Id, requiredScope)
		return deny, nil
	}

	if err := repository.UpdatePatLastUsed(pat.TokenHash); err != nil {
		// Best-effort only; do not fail the request.
		log.Warn("Failed to update personal access token lastUsedAt: ", err)
	}

	return events.APIGatewayV2CustomAuthorizerSimpleResponse{
		IsAuthorized: true,
		Context: map[string]interface{}{
			"username": pat.Username,
			"email":    pat.Email,
			"patId":    pat.Id,
		},
	}, nil
}
