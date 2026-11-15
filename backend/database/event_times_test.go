package database

import (
	"testing"
	"time"
)

func TestGetRRuleDtStartDaylightSaving(t *testing.T) {
	before, err := GetRRuleDtStart("DTSTART;TZID=Europe/Berlin:20260323T180000\nRRULE:FREQ=WEEKLY")
	if err != nil {
		t.Fatal(err)
	}
	after, err := GetRRuleDtStart("DTSTART;TZID=Europe/Berlin:20260406T180000\nRRULE:FREQ=WEEKLY")
	if err != nil {
		t.Fatal(err)
	}

	// 23 Mar 2026 is CET (UTC+1). 6 Apr 2026 is CEST (UTC+2). Both are 18:00 locally.
	if !before.Equal(time.Date(2026, 3, 23, 17, 0, 0, 0, time.UTC)) {
		t.Fatalf("before = %s", before.Format(time.RFC3339))
	}
	if !after.Equal(time.Date(2026, 4, 6, 16, 0, 0, 0, time.UTC)) {
		t.Fatalf("after = %s", after.Format(time.RFC3339))
	}
}

func TestGetRRuleDtStartLegacyUTC(t *testing.T) {
	got, err := GetRRuleDtStart("DTSTART:20260801T150000Z\nRRULE:FREQ=WEEKLY")
	if err != nil {
		t.Fatal(err)
	}
	want := time.Date(2026, 8, 1, 15, 0, 0, 0, time.UTC)
	if !got.Equal(want) {
		t.Fatalf("got %s", got.Format(time.RFC3339))
	}
	if tz := GetRRuleTimeZone("DTSTART:20260801T150000Z\nRRULE:FREQ=WEEKLY"); tz != "" {
		t.Fatalf("legacy rule timezone = %q", tz)
	}
}
