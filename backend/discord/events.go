package discord

import (
	"github.com/bwmarrin/discordgo"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

// SetEvent creates a discord event for events of type EventTypeDojo.
func SetEvent(event *database.Event) (string, string, error) {
	if event.Type != database.EventType_Dojo {
		return "", "", errors.New(400, "Invalid request: event.type must be `DOJO`", "")
	}

	if event.Title == "" {
		return "", "", errors.New(400, "Invalid request: event.title cannot be empty", "")
	}

	startTime, err := database.GetEventStart(event)
	if err != nil {
		return "", "", err
	}
	endTime, err := database.GetEventEnd(event)
	if err != nil {
		return "", "", err
	}

	discord, err := discordgo.New("Bot " + authToken)
	if err != nil {
		return "", "", errors.Wrap(500, "Temporary server error", "Failed to create discord session", err)
	}

	params := &discordgo.GuildScheduledEventParams{
		Name:               event.Title,
		Description:        event.Description,
		ScheduledStartTime: &startTime,
		ScheduledEndTime:   &endTime,
		PrivacyLevel:       discordgo.GuildScheduledEventPrivacyLevelGuildOnly,
		EntityType:         discordgo.GuildScheduledEventEntityTypeExternal,
		EntityMetadata: &discordgo.GuildScheduledEventEntityMetadata{
			Location: event.Location,
		},
	}

	privateEventId, err := setGuildEvent(privateGuildId, event.PrivateDiscordEventId, discord, params)
	if err != nil {
		return "", "", err
	}

	var publicEventId string
	if !event.HideFromPublicDiscord {
		publicEventId, err = setGuildEvent(publicGuildId, event.PublicDiscordEventId, discord, params)
	}

	return privateEventId, publicEventId, err
}

// setGuildEvent either creates a new event or, if eventId is non-empty, updates an existing event in
// the provided guild. The event id is returned.
func setGuildEvent(guildId string, eventId string, discord *discordgo.Session, params *discordgo.GuildScheduledEventParams) (string, error) {
	if guildId == "" {
		return "", nil
	}

	if eventId == "" {
		event, err := discord.GuildScheduledEventCreate(guildId, params)
		if err != nil {
			return "", errors.Wrap(500, "Temporary server error", "Failed to create Guild event", err)
		}
		return event.ID, nil
	}

	_, err := discord.GuildScheduledEventEdit(guildId, eventId, params)
	return eventId, errors.Wrap(500, "Temporary server error", "Failed to edit Guild event", err)
}

// DeleteEvents deletes the provided Discord events.
func DeleteEvents(privateEventId, publicEventId string) error {
	if privateEventId == "" && publicEventId == "" {
		return nil
	}

	discord, err := discordgo.New("Bot " + authToken)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to create discord session", err)
	}

	if privateEventId != "" {
		if err := discord.GuildScheduledEventDelete(privateGuildId, privateEventId); err != nil {
			return errors.Wrap(500, "Temporary server error", "Failed to delete GuildScheduledEvent", err)
		}
	}

	if publicEventId != "" {
		if err := discord.GuildScheduledEventDelete(publicGuildId, publicEventId); err != nil {
			return errors.Wrap(500, "Temporary server error", "Failed to delete GuildScheduledEvent", err)
		}
	}

	return nil
}
