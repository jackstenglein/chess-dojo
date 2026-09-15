package database

import (
	"fmt"
	"regexp"
	"strconv"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

var dtstartRegex = regexp.MustCompile(`DTSTART(?:;[^\n:]*)?:([0-9]{8}T[0-9]{6}Z?)`)

// GetRRuleDtStart parses the DTSTART value from an RRULE string.
func GetRRuleDtStart(rrule string) (time.Time, error) {
	match := dtstartRegex.FindStringSubmatch(rrule)
	if len(match) < 2 {
		return time.Time{}, errors.New(400, "Invalid request: rrule is missing DTSTART", "")
	}

	raw := match[1]
	year, _ := strconv.Atoi(raw[0:4])
	month, _ := strconv.Atoi(raw[4:6])
	day, _ := strconv.Atoi(raw[6:8])
	hour, _ := strconv.Atoi(raw[9:11])
	minute, _ := strconv.Atoi(raw[11:13])
	second, _ := strconv.Atoi(raw[13:15])

	return time.Date(year, time.Month(month), day, hour, minute, second, 0, time.UTC), nil
}

// formatDtStartRRule returns a DTSTART-only rrule string for a non-recurring event.
func formatDtStartRRule(t time.Time) string {
	return "DTSTART:" + t.UTC().Format("20060102T150405Z")
}

// SetNonRecurringTimes sets RRule DTSTART and DurationMs from a start/end range,
// clearing deprecated StartTime/EndTime.
func SetNonRecurringTimes(event *Event, start, end time.Time) {
	event.RRule = formatDtStartRRule(start)
	event.DurationMs = end.Sub(start).Milliseconds()
	event.StartTime = ""
	event.EndTime = ""
}

// GetEventStart returns the series start for an event.
// Prefers legacy StartTime when set; otherwise uses the rrule DTSTART.
func GetEventStart(event *Event) (time.Time, error) {
	if event.StartTime != "" {
		t, err := time.Parse(time.RFC3339, event.StartTime)
		if err != nil {
			return time.Time{}, errors.Wrap(400, "Invalid request: startTime must be RFC3339 format", "", err)
		}
		return t, nil
	}

	if event.RRule != "" {
		return GetRRuleDtStart(event.RRule)
	}

	return time.Time{}, errors.New(400, "Invalid request: event must include startTime or rrule DTSTART", "")
}

// GetEventDuration returns the duration of each occurrence.
// Prefers legacy EndTime - StartTime when both are set; otherwise DurationMs.
func GetEventDuration(event *Event) (time.Duration, error) {
	if event.StartTime != "" && event.EndTime != "" {
		start, err := time.Parse(time.RFC3339, event.StartTime)
		if err != nil {
			return 0, errors.Wrap(400, "Invalid request: startTime must be RFC3339 format", "", err)
		}
		end, err := time.Parse(time.RFC3339, event.EndTime)
		if err != nil {
			return 0, errors.Wrap(400, "Invalid request: endTime must be RFC3339 format", "", err)
		}
		d := end.Sub(start)
		if d <= 0 {
			return 0, errors.New(400, "Invalid request: startTime must be less than endTime", "")
		}
		return d, nil
	}

	if event.DurationMs > 0 {
		return time.Duration(event.DurationMs) * time.Millisecond, nil
	}

	return 0, errors.New(400, "Invalid request: event must include endTime or durationMs", "")
}

// GetEventEnd returns the series end for an event (start + duration).
// Prefers legacy EndTime when set.
func GetEventEnd(event *Event) (time.Time, error) {
	if event.EndTime != "" {
		t, err := time.Parse(time.RFC3339, event.EndTime)
		if err != nil {
			return time.Time{}, errors.Wrap(400, "Invalid request: endTime must be RFC3339 format", "", err)
		}
		return t, nil
	}

	start, err := GetEventStart(event)
	if err != nil {
		return time.Time{}, err
	}
	duration, err := GetEventDuration(event)
	if err != nil {
		return time.Time{}, err
	}
	return start.Add(duration), nil
}

// ValidateEventTimes ensures the event has a resolvable start and positive duration.
func ValidateEventTimes(event *Event) error {
	start, err := GetEventStart(event)
	if err != nil {
		return err
	}
	end, err := GetEventEnd(event)
	if err != nil {
		return err
	}
	if !start.Before(end) {
		return errors.New(400, fmt.Sprintf("Invalid request: start (%s) must be before end (%s)", start.Format(time.RFC3339), end.Format(time.RFC3339)), "")
	}
	return nil
}
