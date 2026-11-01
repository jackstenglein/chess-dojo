package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	cognito "github.com/aws/aws-sdk-go/service/cognitoidentityprovider"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
)

type Event events.CognitoEventUserPoolsPreSignup

const triggerSource = "PreSignUp_ExternalProvider"

var userPoolId = os.Getenv("userPoolId")

func handleError(event Event, err error) (Event, error) {
	log.Error(err)
	return event, err
}

func Handler(ctx context.Context, event Event) (Event, error) {
	log.Infof("Event: %#v", event)

	if event.TriggerSource != triggerSource {
		log.Debugf("Invalid trigger source: %s\n", event.TriggerSource)
		return event, nil
	}
	if event.UserName == "" {
		return handleError(event, errors.New("Invalid request: username is required"))
	}
	email, _ := event.Request.UserAttributes["email"]
	if email == "" {
		return handleError(event, errors.New("Invalid request: email is required"))
	}

	session, err := session.NewSession()
	if err != nil {
		return handleError(event, err)
	}
	svc := cognito.New(session)

	listUsersInput := cognito.ListUsersInput{
		Filter:     new(fmt.Sprintf(`email = "%s"`, email)),
		UserPoolId: new(userPoolId),
	}

	listUsersOutput, err := svc.ListUsers(&listUsersInput)
	if err != nil {
		return handleError(event, err)
	}

	if len(listUsersOutput.Users) == 0 {
		log.Debug("No existing user found, skipping provider link")
		return event, nil
	}

	tokens := strings.Split(event.UserName, "_")
	if len(tokens) < 2 || tokens[0] == "" || tokens[1] == "" {
		return handleError(event, fmt.Errorf("Invalid username: %s", event.UserName))
	}

	linkUserInput := cognito.AdminLinkProviderForUserInput{
		DestinationUser: &cognito.ProviderUserIdentifierType{
			ProviderName:           new("Cognito"),
			ProviderAttributeValue: listUsersOutput.Users[0].Username,
		},
		SourceUser: &cognito.ProviderUserIdentifierType{
			ProviderName:           new(strings.Title(tokens[0])),
			ProviderAttributeName:  new("Cognito_Subject"),
			ProviderAttributeValue: new(tokens[1]),
		},
		UserPoolId: new(userPoolId),
	}
	if _, err := svc.AdminLinkProviderForUser(&linkUserInput); err != nil {
		return handleError(event, err)
	}

	return event, nil
}

func main() {
	lambda.Start(Handler)
}
