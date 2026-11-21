// Implements a Lambda handler to fetch and return the clubs with the
// provided ids. The ids should be provided as a comma-separated list
// in the query param `ids`.
package main

import (
	"context"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository = database.DynamoDB

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	ids := strings.Split(event.QueryStringParameters["ids"], ",")
	if len(ids) == 0 || (len(ids) == 1 && ids[0] == "") {
		return api.Failure(errors.New(400, "Invalid request: ids is required", "")), nil
	}

	var clubs []database.Club
	for i := 0; i < len(ids); i += 100 {
		c, err := repository.BatchGetClubs(ids[i:min(len(ids), i+100)])
		if err != nil {
			return api.Failure(err), nil
		}
		clubs = append(clubs, c...)
	}

	return api.Success(clubs), nil
}
