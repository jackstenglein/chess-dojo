import { describe, expect, it } from 'vitest';
import { NotificationEventSchema, NotificationEventTypes } from './notification';

describe('NotificationEventSchema', () => {
    it('parses a Game Review signup event', () => {
        const event = {
            type: NotificationEventTypes.GAME_REVIEW_SIGNUP,
            username: 'dojo_user',
        };

        expect(NotificationEventSchema.parse(event)).toEqual(event);
    });

    it('rejects a Game Review signup event without a username', () => {
        const result = NotificationEventSchema.safeParse({
            type: NotificationEventTypes.GAME_REVIEW_SIGNUP,
        });

        expect(result.success).toBe(false);
    });
});
