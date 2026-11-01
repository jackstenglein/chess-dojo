package main

import (
	"flag"
	"log"

	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
)

var email = flag.String("email", "", "The email address to send the cheating notification to")

const content = `Hello,

It has come to our attention that your Chess.com or Lichess account has been closed for fairplay violations. In accordance with our Terms of Service, we are exercising our right to terminate your ChessDojo subscription. You can still access the Scoreboard on the free tier, and we wish you the best in your continuing chess improvement journey.

Best,
ChessDojo
`

func main() {
	flag.Parse()

	if *email == "" {
		log.Fatalln("Error: email is required")
	}

	sess, err := session.NewSession()
	if err != nil {
		log.Fatalln("Failed to create AWS session", err)
	}
	svc := ses.New(sess)

	input := &ses.SendEmailInput{
		Destination: &ses.Destination{
			ToAddresses: []*string{
				email,
			},
		},
		Message: &ses.Message{
			Body: &ses.Body{
				Text: &ses.Content{
					Charset: new("UTF-8"),
					Data:    new(content),
				},
			},
			Subject: &ses.Content{
				Charset: new("UTF-8"),
				Data:    new("ChessDojo Subscription Terminated"),
			},
		},
		Source: new("chessdojotwitch@gmail.com"),
	}

	_, err = svc.SendEmail(input)
	if err != nil {
		log.Fatalf("Failed to send to %q: %v\n", *email, err)
	}

	log.Println("Finished.")
}
