package main

import (
	"log"
	"os"

	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var media = database.S3

func main() {
	sess, err := session.NewSession()
	if err != nil {
		log.Fatalln("Failed to create AWS session", err)
	}
	svc := ses.New(sess)

	f, err := os.Create("/tmp/email.html")
	if err != nil {
		log.Fatalln("Failed to create html file: ", errors.Wrap(500, "Temporary server error", "Failed to create file for service account key", err))
	}

	if err = media.Download("chess-dojo-email-templates", "openClassicalPairingMinified.html", f); err != nil {
		log.Fatalln("Failed to download html", err)
	}
	f.Close()

	b, err := os.ReadFile("/tmp/email.html")
	if err != nil {
		log.Fatalln("Failed to read email file", err)
	}
	content := string(b)

	input := &ses.UpdateTemplateInput{
		Template: &ses.Template{
			SubjectPart:  new("Your ChessDojo Open Classical Pairing"),
			HtmlPart:     new(content),
			TemplateName: new("openClassicalPairing"),
		},
	}
	output, err := svc.UpdateTemplate(input)
	if err != nil {
		log.Fatalln("Failed to create template: ", err)
	}
	log.Printf("Got output: %#v\n", output)
}
