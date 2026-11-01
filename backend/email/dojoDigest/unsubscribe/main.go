package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"google.golang.org/api/option"
	sheets "google.golang.org/api/sheets/v4"
)

const sheetId = "1Z83rWOA6xvIoNHoh0NK1j16shXDtoTHOj4mRSMG0x8Y"
const sheetRange = "Unsubscribers"

var media = database.S3
var stage = os.Getenv("stage")

type UnsubscribeRequest struct {
	Email string `json:"email"`
}

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	request := UnsubscribeRequest{}

	if _, ok := event.QueryStringParameters["email"]; ok {
		request.Email = event.QueryStringParameters["email"]
	} else {
		if err := json.Unmarshal([]byte(event.Body), &request); err != nil {
			err = errors.Wrap(400, "Invalid request: unable to unmarshal request body", "", err)
			return api.Failure(err), nil
		}
	}

	if request.Email == "" {
		return api.Success(nil), nil
	}

	client, err := getSheetsClient(ctx)
	if err != nil {
		return api.Failure(err), nil
	}

	call := getAppendCall(ctx, client, &request)
	_, err = call.Do()
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to write to sheet", err)
		return api.Failure(err), nil
	}

	if err := os.Remove("/tmp/serviceAccountKey.json"); err != nil {
		log.Errorf("Failed to rmeove JSON file: %v", err)
	}

	return api.Success(nil), nil
}

// Gets a client for Google Sheets.
func getSheetsClient(ctx context.Context) (*sheets.Service, error) {
	f, err := os.Create("/tmp/serviceAccountKey.json")
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to create file for service account key", err)
	}

	if err = media.Download(fmt.Sprintf("chess-dojo-%s-secrets", stage), "dojoDigestUnsubscribeServiceAccountKey.json", f); err != nil {
		return nil, err
	}
	if err = f.Close(); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to close file for service account key", err)
	}

	client, err := sheets.NewService(ctx, option.WithCredentialsFile("/tmp/serviceAccountKey.json"))
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to create Sheets client", err)
	}
	return client, nil
}

// Returns the SpreadsheetValuesAppendCall that will append the values in the UnsubscribeRequest
// to the spreadsheet.
func getAppendCall(ctx context.Context, client *sheets.Service, req *UnsubscribeRequest) *sheets.SpreadsheetsValuesAppendCall {
	valueRange := &sheets.ValueRange{
		MajorDimension: "ROWS",
		Values: [][]any{
			{
				time.Now().Format(time.RFC3339), // submission time
				req.Email,                       // email
				"Unsubscribe form on website",   // reason
			},
		},
	}
	return client.Spreadsheets.Values.Append(sheetId, sheetRange, valueRange).ValueInputOption("RAW").Context(ctx)
}
