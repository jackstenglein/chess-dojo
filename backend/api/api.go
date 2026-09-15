package api

import (
	"encoding/json"
	"fmt"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"

	"github.com/aws/aws-lambda-go/events"
)

type Request events.APIGatewayV2HTTPRequest
type Response events.APIGatewayProxyResponse

// UserInfo contains user information that is accessible from the Cognito id token claims.
type UserInfo struct {
	// The username of the user.
	Username string `json:"-"`
	// The email of the user
	Email string `json:"-"`
	// The name of the user.
	Name string `json:"-"`
}

// GetUserInfo extracts the user info from the id token claim of the given request.
// If the request was authenticated by a Lambda authorizer instead of the Cognito
// JWT authorizer (Eg: personal access tokens), the user info is extracted from
// the Lambda authorizer context. Any fields that cannot be extracted are left
// blank.
func GetUserInfo(event Request) *UserInfo {
	var username string
	var email string
	var name string

	if authorizer := event.RequestContext.Authorizer; authorizer != nil {
		if jwt := authorizer.JWT; jwt != nil {
			if claims := jwt.Claims; claims != nil {
				username = claims["cognito:username"]
				email = claims["email"]
				name = claims["name"]
			}
		}

		if lambdaCtx := authorizer.Lambda; lambdaCtx != nil {
			if v, ok := lambdaCtx["username"].(string); ok && username == "" {
				username = v
			}
			if v, ok := lambdaCtx["email"].(string); ok && email == "" {
				email = v
			}
			if v, ok := lambdaCtx["name"].(string); ok && name == "" {
				name = v
			}
		}
	}

	return &UserInfo{Username: username, Email: email, Name: name}
}

// errorToResponse converts the given error into an AWS ApiGateway Response object.
func errorToResponse(e *errors.Error) Response {
	if e == nil {
		return Response{StatusCode: 200}
	}

	if e.Code >= 500 {
		log.Error(e)
	} else {
		log.Warn(e)
	}

	var message string
	if body, err := json.Marshal(e); err != nil {
		log.Error("Cannot marshal error:", err)
		message = fmt.Sprintf("Unknown error (cannot marshal): %s", e.PublicMessage)
	} else {
		message = string(body)
	}

	return Response{
		StatusCode:      e.Code,
		IsBase64Encoded: false,
		Body:            message,
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	}
}

// Failure converts the given error into an AWS ApiGateway Response object.
func Failure(err error) Response {
	var lerr *errors.Error
	if errors.As(err, &lerr) {
		return errorToResponse(lerr)
	}

	log.Error(err)
	var message string
	body, err := json.Marshal(map[string]interface{}{
		"code":    500,
		"message": "Unknown error (unknown type): " + err.Error(),
	})
	if err != nil {
		message = fmt.Sprintf("{\"publicMessage\": \"Unknown error (unknown type, cannot marshal): %s\"}", err)
	} else {
		message = string(body)
	}

	return Response{
		StatusCode:      500,
		IsBase64Encoded: false,
		Body:            message,
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	}
}

// Success returns an AWS ApiGateway Response object with the provided
// object encoded as the JSON body.
func Success(in interface{}) Response {
	body, err := json.Marshal(in)
	if err != nil {
		log.Error(err)
		return Response{
			StatusCode:      500,
			IsBase64Encoded: false,
			Body:            fmt.Sprintf("{\"publicMessage\": \"Request was successful, but body failed to marshal: %s\"}", err),
			Headers: map[string]string{
				"Content-Type":                "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		}
	}

	log.Debugf("Response: %#v", in)
	return Response{
		StatusCode:      200,
		IsBase64Encoded: false,
		Body:            string(body),
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	}
}
