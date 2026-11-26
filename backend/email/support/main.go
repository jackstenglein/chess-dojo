// Implements a Lambda handler which sends an email to our support email address.
package main

import (
	"context"
	"encoding/json"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
	"github.com/google/uuid"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
)

type SupportRequest struct {
	Username string `json:"username"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Subject  string `json:"subject"`
	Message  string `json:"message"`
}

type SupportResponse struct {
	TicketId string `json:"ticketId"`
}

const supportEmail = "chessdojo.tickets@gmail.com"

var sesInstance = ses.New(session.Must(session.NewSession()))

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	request := SupportRequest{}
	if err := json.Unmarshal([]byte(event.Body), &request); err != nil {
		err = errors.Wrap(400, "Invalid request: unable to unmarshal request body", "", err)
		return api.Failure(err), nil
	}
	if err := validateRequest(request); err != nil {
		return api.Failure(err), nil
	}
	request.Username = api.GetUserInfo(event).Username

	response := SupportResponse{TicketId: uuid.NewString()}
	templateData := struct {
		SupportRequest
		SupportResponse
	}{
		SupportRequest:  request,
		SupportResponse: response,
	}
	templateDataStr, err := json.Marshal(templateData)
	if err != nil {
		err := errors.Wrap(500, "Temporary server error", "Failed to marshal template data", err)
		return api.Failure(err), nil
	}

	input := &ses.SendTemplatedEmailInput{
		Destination: &ses.Destination{
			ToAddresses: []*string{new(supportEmail)},
			CcAddresses: []*string{new(request.Email)},
		},
		Source:       new("ChessDojo Support <no-reply@mail.chessdojo.club>"),
		Template:     new("supportTicket"),
		TemplateData: new(string(templateDataStr)),
	}
	if _, err := sesInstance.SendTemplatedEmail(input); err != nil {
		return api.Failure(errors.Wrap(500, "Temporary server error", "Failed to send email", err)), nil
	}

	return api.Success(response), nil
}

func validateRequest(request SupportRequest) error {
	if request.Name == "" {
		return errors.New(400, "Invalid request: name is required", "")
	}
	if request.Email == "" {
		return errors.New(400, "Invalid request: email is required", "")
	}
	if request.Subject == "" {
		return errors.New(400, "Invalid request: subject is required", "")
	}
	if request.Message == "" {
		return errors.New(400, "Invalid request: message is required", "")
	}
	return nil
}
