package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type courseScanner interface {
	ScanAllCourses() ([]database.Course, error)
}

var repository courseScanner = database.DynamoDB

var stage = os.Getenv("stage")

// CourseVideoIndexEntry is one course's embeddable videos. Modules are
// "chapter/module" indexes into course.chapters.
type CourseVideoIndexEntry struct {
	Type    string   `json:"type"`
	Id      string   `json:"id"`
	Intro   bool     `json:"intro"`
	Modules []string `json:"modules"`
}

type CourseVideoIndexResponse struct {
	Courses []CourseVideoIndexEntry `json:"courses"`
}

func main() {
	if stage == "prod" {
		log.SetLevel(log.InfoLevel)
	}
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)

	courses, err := repository.ScanAllCourses()
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(&CourseVideoIndexResponse{
		Courses: buildCourseVideoIndex(courses),
	}), nil
}

func buildCourseVideoIndex(courses []database.Course) []CourseVideoIndexEntry {
	entries := make([]CourseVideoIndexEntry, 0, len(courses))
	for _, course := range courses {
		entry := CourseVideoIndexEntry{
			Type:    string(course.Type),
			Id:      course.Id,
			Intro:   strings.TrimSpace(course.VideoUrl) != "",
			Modules: []string{},
		}
		for chapterIndex, chapter := range course.Chapters {
			if chapter == nil {
				continue
			}
			for moduleIndex, module := range chapter.Modules {
				if moduleHasVideo(module) {
					entry.Modules = append(entry.Modules, fmt.Sprintf("%d/%d", chapterIndex, moduleIndex))
				}
			}
		}
		entries = append(entries, entry)
	}
	return entries
}

func moduleHasVideo(module *database.CourseModule) bool {
	if module == nil {
		return false
	}
	for _, url := range module.VideoUrls {
		if strings.TrimSpace(url) != "" {
			return true
		}
	}
	return false
}
