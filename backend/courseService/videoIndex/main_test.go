package main

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/google/go-cmp/cmp"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

func TestBuildCourseVideoIndex(t *testing.T) {
	courses := []database.Course{
		{
			Type:     database.Opening,
			Id:       "intro-and-module",
			VideoUrl: "  https://youtu.be/intro  ",
			Status:   database.CourseStatusDraft,
			Chapters: []*database.Chapter{
				nil,
				{
					Modules: []*database.CourseModule{
						{Type: database.Video, VideoUrls: []string{"  "}},
						{Type: database.PgnViewer, VideoUrls: []string{"https://youtu.be/pgn"}},
						nil,
					},
				},
			},
		},
		{
			Type: database.Endgame,
			Id:   "engine-only",
			Chapters: []*database.Chapter{
				{Modules: []*database.CourseModule{{Type: database.Exercises}}},
			},
		},
	}

	got := buildCourseVideoIndex(courses)
	want := []CourseVideoIndexEntry{
		{
			Type:    "OPENING",
			Id:      "intro-and-module",
			Intro:   true,
			Modules: []string{"1/1"},
		},
		{
			Type:    "ENDGAME",
			Id:      "engine-only",
			Intro:   false,
			Modules: []string{},
		},
	}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Fatalf("buildCourseVideoIndex() mismatch (-want +got):\n%s", diff)
	}
}

type mockScanner struct {
	courses []database.Course
	err     error
}

func (m mockScanner) ScanAllCourses() ([]database.Course, error) {
	return m.courses, m.err
}

func TestHandler(t *testing.T) {
	original := repository
	repository = mockScanner{courses: []database.Course{{
		Type:     database.Workshop,
		Id:       "workshop",
		VideoUrl: "https://youtu.be/intro",
	}}}
	t.Cleanup(func() { repository = original })

	resp, err := handler(context.Background(), api.Request{
		RequestContext: events.APIGatewayV2HTTPRequestContext{RequestID: "test"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("status = %d, body = %s", resp.StatusCode, resp.Body)
	}

	var got CourseVideoIndexResponse
	if err := json.Unmarshal([]byte(resp.Body), &got); err != nil {
		t.Fatal(err)
	}
	want := CourseVideoIndexResponse{Courses: []CourseVideoIndexEntry{{
		Type:    "WORKSHOP",
		Id:      "workshop",
		Intro:   true,
		Modules: []string{},
	}}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Fatalf("handler() mismatch (-want +got):\n%s", diff)
	}
}
