package main

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var stage = os.Getenv("stage")

type Event events.CloudWatchEvent

var repository database.GameLister = database.DynamoDB

func getZipFile() (*os.File, *zip.Writer, io.Writer, error) {
	date := time.Now().Format(time.DateOnly)
	archive, err := os.Create(fmt.Sprintf("/tmp/%s_dojo_database.zip", date))
	if err != nil {
		return nil, nil, nil, err
	}

	zipWriter := zip.NewWriter(archive)
	w, err := zipWriter.Create(fmt.Sprintf("%s_dojo_database.pgn", date))
	if err != nil {
		defer archive.Close()
		return nil, nil, nil, err
	}

	return archive, zipWriter, w, nil
}

func processGames(w io.Writer, games []*database.Game) error {
	for _, game := range games {
		if game.Unlisted {
			continue
		}
		if _, err := w.Write([]byte(game.Pgn)); err != nil {
			return err
		}
		if _, err := w.Write([]byte("\n\n")); err != nil {
			return err
		}
	}
	return nil
}

func uploadFile(archive *os.File) error {
	log.Info("Uploading file")
	archive.Seek(0, 0)
	uploader := s3manager.NewUploader(session.Must(session.NewSession()))
	_, err := uploader.Upload(&s3manager.UploadInput{
		Bucket: new(fmt.Sprintf("chess-dojo-%s-game-database", stage)),
		Key:    new("dojo_database.zip"),
		Body:   archive,
	})
	return err
}

func Handler(ctx context.Context, event Event) (Event, error) {
	log.Infof("Event: %#v", event)
	log.SetRequestId(event.ID)

	archive, zipWriter, w, err := getZipFile()
	if err != nil {
		log.Errorf("Failed to create pgn file: %v", err)
		return event, err
	}
	defer archive.Close()

	var games []*database.Game
	var startKey string

	for _, cohort := range database.Cohorts {
		for ok := true; ok; ok = startKey != "" {
			games, startKey, err = repository.ScanCohort(cohort, startKey)
			if err != nil {
				log.Errorf("Failed to scan games: %v", err)
				return event, err
			}

			log.Infof("Processing %d games", len(games))
			if err := processGames(w, games); err != nil {
				log.Errorf("Failed to process games: %v", err)
				return event, err
			}
		}
	}

	zipWriter.Close()

	if err := uploadFile(archive); err != nil {
		log.Errorf("Failed to upload pgn file: %v", err)
		return event, err
	}
	log.Info("File uploaded")
	return event, nil
}

func main() {
	lambda.Start(Handler)
}
