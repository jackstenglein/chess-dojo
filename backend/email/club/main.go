package main

import (
	"encoding/csv"
	"io"
	"log"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
)

const content = `Hello,

The Dojo wants to become the training platform for your OTB club! We are offering the first three OTB clubs/teams who have 10 or more members ready to try out the Dojo six months of free membership. OTB club members who want to join the Dojo later on can also receive the discount.

To receive the discount, please send the name of your club and the emails of the 10+ players to chessdojotwitch@gmail.com. Of course, if you are already in the Dojo, then you count as one of the players. Each team will then receive its own scoreboard. Our dream is that teams can use the training program and the scoreboard to train together and track each others' progress. Over time, we firmly believe that teams who use the Dojo will be superior to those who don't!

Best,
ChessDojo
`

func main() {
	sess, err := session.NewSession()
	if err != nil {
		log.Fatalln("Failed to create AWS session", err)
	}
	svc := ses.New(sess)

	data, err := os.Open("emails.csv")
	if err != nil {
		log.Fatal(err)
	}
	defer data.Close()
	csvReader := csv.NewReader(data)

	total := 0
	success := 0
	failed := 0

	for {
		if total%100 == 0 {
			log.Printf("Success: %d, Failed: %d\n", success, failed)
		}

		rec, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Fatal(err)
		}
		total++

		email := strings.TrimSpace(rec[2])

		input := &ses.SendEmailInput{
			Destination: &ses.Destination{
				ToAddresses: []*string{
					new(email),
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
					Data:    new("ChessDojo Discount for OTB Groups"),
				},
			},
			Source: new("ChessDojo <chessdojotwitch@gmail.com>"),
		}

		_, err = svc.SendEmail(input)
		if err != nil {
			log.Printf("Failed to send to %q: %v\n", email, err)
			failed++
		} else {
			success++
		}
	}

	log.Printf("Finished. Success: %d, Failed: %d\n", success, failed)
}
