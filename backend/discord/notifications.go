package discord

import (
	stderrors "errors"
	"fmt"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var CohortEmojiIds = map[database.DojoCohort]string{
	"0-300":     "<:0300:1245553660730277899>",
	"300-400":   "<:300400:1245553824895209573>",
	"400-500":   "<:400500:1245553996383522917>",
	"500-600":   "<:500600:1245554255654555678>",
	"600-700":   "<:600700:1245554419312103474>",
	"700-800":   "<:700800:1245554744315875380>",
	"800-900":   "<:800900:1245555040240926812>",
	"900-1000":  "<:9001000:1245555222009352236>",
	"1000-1100": "<:10001100:1245555385776083004>",
	"1100-1200": "<:11001200:1245555535433171024>",
	"1200-1300": "<:12001300:1245555683605352569>",
	"1300-1400": "<:13001400:1245556021850800138>",
	"1400-1500": "<:14001500:1245556197621366815>",
	"1500-1600": "<:15001600:1245556433584525416>",
	"1600-1700": "<:16001700:1245556597632270439>",
	"1700-1800": "<:17001800:1245556793187242024>",
	"1800-1900": "<:18001900:1245556946082332752>",
	"1900-2000": "<:19002000:1245557109404467240>",
	"2000-2100": "<:20002100:1245557259208101978>",
	"2100-2200": "<:21002200:1245557558299725834>",
	"2200-2300": "<:22002300:1245557713296162866>",
	"2300-2400": "<:23002400:1245557941902512158>",
}

const (
	MessageEmojiClock     = "⏰"
	MessageEmojiNotepad   = "🗒️"
	MessageEmojiArrow     = "➡️"
	MessageEmojiDojo      = "🥋"
	MessageEmojiCheck     = "✅"
	MessageEmojiVote      = "🗳️"
	MessageEmojiWave      = "👋"
	MessageEmojiCoach     = "🚀"
	MessageEmojiCoachUser = "🎓"
	MessageEmojiPrice     = "💰"
)

var RoleIds = map[database.DojoCohort]string{
	"0-300":     "1107651005547548742",
	"300-400":   "951960545077100645",
	"400-500":   "951995036487254026",
	"500-600":   "1107650883807891547",
	"600-700":   "951995253378940999",
	"700-800":   "1007088844425932820",
	"800-900":   "951995299407212564",
	"900-1000":  "1007089559550570578",
	"1000-1100": "951995406835925042",
	"1100-1200": "951995460174872586",
	"1200-1300": "951995519272624179",
	"1300-1400": "951996640271675403",
	"1400-1500": "951995556287377438",
	"1500-1600": "951995620049190942",
	"1600-1700": "951995656959058010",
	"1700-1800": "951995701909409862",
	"1800-1900": "951995756057882665",
	"1900-2000": "951995789935247441",
	"2000-2100": "951995832327086090",
	"2100-2200": "951995870264569916",
	"2200-2300": "951995912564121601",
	"2300-2400": "951995973385740329",
	"2400+":     "951996035792764998",
}

// SendCancellationNotification sends a notification of a cancelled meeting
// to the provided user through Discord DM.
func SendCancellationNotification(username string, msg string) error {
	user, err := repository.GetUser(username)
	if err != nil {
		return err
	}

	if user.NotificationSettings.DiscordNotificationSettings.GetDisableMeetingCancellation() {
		return nil
	}

	return SendNotification(user, msg)
}

// Sends a notification of a new event.
func SendEventNotification(event *database.Event) (string, error) {
	if event.Type == database.EventType_Availability {
		return SendAvailabilityNotification(event)
	}
	if event.Type == database.EventType_Coaching {
		return SendCoachingNotification(event)
	}
	return "", errors.New(400, "Invalid request: event.type must be `AVAILABILITY` or `COACHING`", "")
}

// SendAvailabilityNotification sends a notification of a new event of type EventTypeAvailability.
func SendAvailabilityNotification(event *database.Event) (string, error) {
	if event.Type != database.EventType_Availability {
		return "", errors.New(400, "Invalid request: event.type must be `AVAILABILITY`", "")
	}

	if event.InviteOnly {
		return "", nil
	}

	discord, err := discordgo.New("Bot " + authToken)
	if err != nil {
		return "", errors.Wrap(500, "Temporary server error", "Failed to create discord session", err)
	}

	startTime, err := time.Parse(time.RFC3339, event.StartTime)
	if err != nil {
		return "", errors.Wrap(400, "Invalid request: availability.startTime cannot be parsed", "", err)
	}
	endTime, err := time.Parse(time.RFC3339, event.EndTime)
	if err != nil {
		return "", errors.Wrap(400, "Invalid request: availability.endTime cannot be parsed", "", err)
	}

	var sb strings.Builder

	discordId, err := GetDiscordIdByCognitoUsername(discord, event.Owner)
	if err != nil {
		log.Errorf("Failed to get discordId: %v", err)
		sb.WriteString(fmt.Sprintf("## **Availability posted by** %s", event.OwnerDisplayName))
	} else {
		sb.WriteString(fmt.Sprintf("## **Availability posted by** <@%s>", discordId))
	}

	sb.WriteString(fmt.Sprintf("\n<t:%d:f> — <t:%d:t>", startTime.Unix(), endTime.Unix()))

	if event.Title != "" {
		sb.WriteString(fmt.Sprintf("\n **Title:** %s", event.Title))
	}
	if event.Description != "" {
		sb.WriteString(fmt.Sprintf("\n **Description:** %s", event.Description))
	}

	sb.WriteString("\n **Types:** ")
	sb.WriteString(strings.Join(database.GetDisplayNames(event.Types), ", "))

	sb.WriteString("\n **Cohorts:** ")
	sb.WriteString(getEventCohorts(event.Cohorts))

	sb.WriteString(fmt.Sprintf("\n **Current Participants:** %d/%d", len(event.Participants), event.MaxParticipants))
	sb.WriteString(fmt.Sprintf("\n %s [**Click to Book**](<%s/calendar/availability/%s>)", MessageEmojiArrow, frontendHost, event.Id))

	if event.DiscordMessageId == "" {
		msg, err := discord.ChannelMessageSend(findGameChannelId, sb.String())
		if err != nil {
			return "", errors.Wrap(500, "Temporary server error", "Failed to send discord channel message", err)
		}
		return msg.ID, nil
	} else {
		_, err := discord.ChannelMessageEdit(findGameChannelId, event.DiscordMessageId, sb.String())
		return event.DiscordMessageId, errors.Wrap(500, "Temporary server error", "Failed to edit discord channel message", err)
	}
}

// Gets the cohort range as a user-friendly display string
func getEventCohorts(cohorts []database.DojoCohort) string {
	var sb strings.Builder
	for i, c := range cohorts {
		start, end := getCohortRange(c)
		if i == 0 {
			sb.WriteString(start)
		}

		if i+1 < len(cohorts) {
			nextStart, _ := getCohortRange(cohorts[i+1])
			if !strings.HasPrefix(nextStart, end) {
				sb.WriteString(fmt.Sprintf("-%s, %s", end, nextStart))
			}
		} else {
			sb.WriteString(fmt.Sprintf("-%s", end))
		}
	}
	return sb.String()
}

// Returns the start and end of the cohort range as separate strings.
// 2400+ returns itself for both the start and end
func getCohortRange(cohort database.DojoCohort) (string, string) {
	tokens := strings.Split(string(cohort), "-")
	if len(tokens) < 2 {
		return tokens[0], tokens[0]
	}
	return tokens[0], tokens[1]
}

// Sends a notification for coaching events. If the given event already has a Discord Message ID,
// the existing message is updated.
func SendCoachingNotification(event *database.Event) (string, error) {
	if event.Type != database.EventType_Coaching {
		return "", errors.New(400, "Invalid request: event.type must be `COACHING`", "")
	}
	if event.Status == database.SchedulingStatus_Canceled {
		return "", DeleteMessageInChannel(coachingChannelId, event.DiscordMessageId)
	}

	discord, err := discordgo.New("Bot " + authToken)
	if err != nil {
		return "", errors.Wrap(500, "Temporary server error", "Failed to create discord session", err)
	}

	startTime, err := time.Parse(time.RFC3339, event.StartTime)
	if err != nil {
		return "", errors.Wrap(400, "Invalid request: event.startTime cannot be parsed", "", err)
	}
	endTime, err := time.Parse(time.RFC3339, event.EndTime)
	if err != nil {
		return "", errors.Wrap(400, "Invalid request: event.endTime cannot be parsed", "", err)
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## %s %s", MessageEmojiCoach, event.Title))

	discordId, err := GetDiscordIdByCognitoUsername(discord, event.Owner)
	if err != nil {
		log.Errorf("Failed to get discordId: %v", err)
		sb.WriteString(fmt.Sprintf("\n **Coach %s:** %s", MessageEmojiCoachUser, event.OwnerDisplayName))
	} else {
		sb.WriteString(fmt.Sprintf("\n **Coach %s:** <@%s>", MessageEmojiCoachUser, discordId))
	}

	sb.WriteString(fmt.Sprintf("\n **Time %s:** <t:%d:f> - <t:%d:f>", MessageEmojiClock, startTime.Unix(), endTime.Unix()))

	if event.Coaching.CurrentPrice > 0 {
		sb.WriteString(fmt.Sprintf("\n **Price %s:** ~~$%.2f~~ $%.2f", MessageEmojiPrice, float32(event.Coaching.FullPrice)/100, float32(event.Coaching.CurrentPrice)/100))
	} else {
		sb.WriteString(fmt.Sprintf("\n **Price %s:** $%.2f", MessageEmojiPrice, float32(event.Coaching.FullPrice)/100))
	}

	sb.WriteString(fmt.Sprintf("\n **Description %s:** %s", MessageEmojiNotepad, event.Description))

	sb.WriteString(fmt.Sprintf("\n **Cohorts %s:** ", MessageEmojiDojo))
	for i, c := range event.Cohorts {
		roleId := RoleIds[c]
		if roleId == "" {
			sb.WriteString(fmt.Sprintf("%s %s", string(c), CohortEmojiIds[c]))
		} else {
			sb.WriteString(fmt.Sprintf("<@&%s> %s", roleId, CohortEmojiIds[c]))
		}
		if i+1 < len(event.Cohorts) {
			sb.WriteString(", ")
		}
	}

	sb.WriteString(fmt.Sprintf("\n **Current Participants %s:** %d/%d", MessageEmojiVote, len(event.Participants), event.MaxParticipants))
	sb.WriteString(fmt.Sprintf("\n %s [**Click to Book**](<%s/calendar/availability/%s>)", MessageEmojiArrow, frontendHost, event.Id))

	if event.DiscordMessageId == "" {
		msg, err := discord.ChannelMessageSend(coachingChannelId, sb.String())
		if err != nil {
			return "", errors.Wrap(500, "Temporary server error", "Failed to send discord channel message", err)
		}
		return msg.ID, nil
	} else {
		_, err := discord.ChannelMessageEdit(coachingChannelId, event.DiscordMessageId, sb.String())
		return event.DiscordMessageId, errors.Wrap(500, "Temporary server error", "Failed to edit discord channel message", err)
	}
}

// Deletes the Discord notification message associated with the given Event.
func DeleteEventNotification(event *database.Event) error {
	if event.Type == database.EventType_Availability {
		return DeleteMessageInChannel(findGameChannelId, event.DiscordMessageId)
	}
	if event.Type == database.EventType_Coaching {
		return DeleteMessageInChannel(coachingChannelId, event.DiscordMessageId)
	}
	return nil
}

// Deletes the Discord message in the provided channel.
func DeleteMessageInChannel(channelId, messageId string) error {
	if channelId == "" || messageId == "" {
		return nil
	}

	discord, err := discordgo.New("Bot " + authToken)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to create discord session", err)
	}

	err = discord.ChannelMessageDelete(channelId, messageId)
	return errors.Wrap(500, "Temporary server error", "Failed to delete Discord channel message", err)
}

// SendNotification sends the provided message over Discord DM to the provided user.
func SendNotification(user *database.User, message string) error {
	if user.DiscordUsername == "" {
		return errors.New(400, "Cannot send discord notification to empty username", "")
	}

	discordTokens := strings.Split(user.DiscordUsername, "#")
	if len(discordTokens) == 0 {
		return errors.New(400, fmt.Sprintf("Cannot send discord notification to username `%s`", user.DiscordUsername), "")
	}
	var discordUsername, discordDiscriminator string
	discordUsername = discordTokens[0]
	if len(discordTokens) > 1 {
		discordDiscriminator = discordTokens[1]
	}

	discord, err := discordgo.New("Bot " + authToken)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to create discord session", err)
	}

	discordUsers, err := discord.GuildMembersSearch(privateGuildId, discordUsername, 1000)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to search for guild members", err)
	}
	if len(discordUsers) == 0 {
		return errors.New(404, fmt.Sprintf("Cannot find discord username `%s`", user.DiscordUsername), "")
	}

	var discordUser *discordgo.Member
	if len(discordUsers) == 1 {
		discordUser = discordUsers[0]
	} else if discordDiscriminator == "" {
		return errors.New(400, fmt.Sprintf("Discord username `%s` does not contain # number and there are multiple users found", user.DiscordUsername), "")
	} else {
		for _, u := range discordUsers {
			if u.User.Discriminator == discordDiscriminator {
				discordUser = u
				break
			}
		}
		if discordUser == nil {
			return errors.New(404, fmt.Sprintf("Discord search returned users, but cannot find matching discriminator for discord username `%s`", user.DiscordUsername), "")
		}
	}

	channel, err := discord.UserChannelCreate(discordUser.User.ID)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to create discord channel", err)
	}

	_, err = discord.ChannelMessageSend(channel.ID, message)
	return errors.Wrap(500, "Temporary server error", "Failed to send discord message", err)
}

// SendMilestoneNotificationToSenseis sends a Discord DM to each sensei informing
// them that a user has reached the given completion milestone.
func SendMilestoneNotificationToSenseis(user *database.User, percent int) error {
	senseiIds, err := GetSenseiDiscordIds()
	if err != nil {
		return err
	}

	if len(senseiIds) == 0 {
		log.Infof("No senseis found; skipping milestone notification for %s", user.Username)
		return nil
	}

	discord, err := discordgo.New("Bot " + authToken)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to create discord session", err)
	}

	cohortEmoji := CohortEmojiIds[user.DojoCohort]
	var userRef string
	if user.DiscordId != "" {
		userRef = fmt.Sprintf("<@%s>", user.DiscordId)
	} else {
		userRef = fmt.Sprintf("**%s**", user.DisplayName)
	}
	message := fmt.Sprintf(
		"%s %s has reached **%d%%** completion in the %s %s training program.",
		MessageEmojiDojo, userRef, percent, string(user.DojoCohort), cohortEmoji,
	)

	var errs []error
	for _, senseiId := range senseiIds {
		channel, err := discord.UserChannelCreate(senseiId)
		if err != nil {
			log.Errorf("Failed to create DM channel for sensei %s: %v", senseiId, err)
			errs = append(errs, err)
			continue
		}
		if _, err := discord.ChannelMessageSend(channel.ID, message); err != nil {
			log.Errorf("Failed to send milestone DM to sensei %s: %v", senseiId, err)
			errs = append(errs, err)
		}
	}
	return stderrors.Join(errs...)
}

func SendMessageInChannel(message string, channelId string) (string, error) {
	discord, err := discordgo.New("Bot " + authToken)
	if err != nil {
		return "", errors.Wrap(500, "Temporary server error", "Failed to create discord session", err)
	}

	msg, err := discord.ChannelMessageSend(channelId, message)
	if err != nil {
		return "", errors.Wrap(500, "Temporary server error", "Failed to send discord channel message", err)
	}
	return msg.ID, nil
}
