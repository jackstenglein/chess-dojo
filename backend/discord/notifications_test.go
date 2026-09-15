package discord

import (
	"fmt"
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

func TestGraduationAnnouncementMessageMentionsDiscordId(t *testing.T) {
	withFrontendHost(t, "https://www.chessdojo.club")

	graduation := &database.Graduation{
		Username:  "dojo-user",
		NewCohort: "1600-1700",
	}
	user := &database.User{
		Username:    "dojo-user",
		DisplayName: "Dojo User",
		DiscordId:   "123456789",
	}

	got := graduationAnnouncementMessage(graduation, user, user.DiscordId)
	want := fmt.Sprintf(
		"%s Congrats to <@123456789>, who just graduated to **1600-1700**!\n%s [**View Profile**](<https://www.chessdojo.club/profile/dojo-user>)",
		MessageEmojiDojo,
		MessageEmojiArrow,
	)
	if got != want {
		t.Fatalf("graduationAnnouncementMessage() = %q, want %q", got, want)
	}
}

func TestGraduationAnnouncementMessageFallsBackToDisplayName(t *testing.T) {
	withFrontendHost(t, "")

	graduation := &database.Graduation{
		Username:  "dojo-user",
		NewCohort: "2400+",
	}
	user := &database.User{
		Username:    "dojo-user",
		DisplayName: "Dojo User",
	}

	got := graduationAnnouncementMessage(graduation, user, "")
	want := fmt.Sprintf(
		"%s Congrats to **Dojo User**, who just graduated to **2400+**!",
		MessageEmojiDojo,
	)
	if got != want {
		t.Fatalf("graduationAnnouncementMessage() = %q, want %q", got, want)
	}
}

func withFrontendHost(t *testing.T, host string) {
	t.Helper()

	originalFrontendHost := frontendHost
	frontendHost = host
	t.Cleanup(func() {
		frontendHost = originalFrontendHost
	})
}
