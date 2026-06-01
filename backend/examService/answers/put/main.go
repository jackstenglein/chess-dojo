// Implements a Lambda handler which saves an ExamAttempt in the database. The
// ExamAnswer is always returned. The Exam is only returned if it was updated.
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

var repository = database.DynamoDB

type PutExamAttemptRequest struct {
	ExamType   database.ExamType    `json:"examType"`
	ExamId     string               `json:"examId"`
	Attempt    database.ExamAttempt `json:"attempt"`
	Index      *int                 `json:"index,omitempty"`
	TotalScore int                  `json:"totalScore"`
}

type PutExamAnswerResponse struct {
	Exam   *database.Exam       `json:"exam,omitempty"`
	Answer *database.ExamAnswer `json:"answer,omitempty"`
}

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Debugf("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	request := PutExamAttemptRequest{}
	if err := json.Unmarshal([]byte(event.Body), &request); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: failed to unmarshal body", "", err)), nil
	}

	if string(request.ExamType) == "" {
		return api.Failure(errors.New(400, "Invalid request: examType is required", "")), nil
	}
	if request.ExamId == "" {
		return api.Failure(errors.New(400, "Invalid request: examId is required", "")), nil
	}
	if request.Attempt.Cohort == "" {
		return api.Failure(errors.New(400, "Invalid request: attempt.cohort is required", "")), nil
	}

	request.Attempt.CreatedAt = time.Now().Format(time.RFC3339)

	answer, err := repository.PutExamAttempt(info.Username, request.ExamId, request.ExamType, &request.Attempt, request.Index)
	if err != nil {
		return api.Failure(err), nil
	}

	exam, err := repository.PutExamAnswerSummary(answer, request.TotalScore)
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(PutExamAnswerResponse{Answer: answer, Exam: exam}), nil
}
