import { sendDirectMessage } from './discord';

/** Returns Discord user IDs configured to receive sensei-only notifications. */
export function getSenseiDiscordIds(): string[] {
    return (process.env.senseiDiscordIds ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
}

/** Sends a Discord DM to each configured sensei and logs per-recipient failures. */
export async function sendSenseiDirectMessages(eventType: string, message: string) {
    const senseiDiscordIds = getSenseiDiscordIds();

    for (const discordId of senseiDiscordIds) {
        try {
            await sendDirectMessage(discordId, message);
            console.log(`Successfully sent Discord message to ${discordId} for ${eventType}`);
        } catch (err) {
            console.error(`Failed to send ${eventType} Discord DM to ${discordId}:`, err);
        }
    }
}
