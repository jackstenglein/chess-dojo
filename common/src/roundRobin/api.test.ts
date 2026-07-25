import { describe, expect, it } from 'vitest';
import { RoundRobinAdminSetResultSchema, RoundRobinAdminUpdatePlayerSchema } from './api';

describe('roundRobin/api admin schemas', () => {
    describe('RoundRobinAdminSetResultSchema', () => {
        const base = {
            cohort: '1500-1600',
            startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
            round: 1,
            white: 'alice',
            black: 'bob',
        };

        it('parses a manual result without url', () => {
            const input = { ...base, result: '1-0' as const };
            expect(RoundRobinAdminSetResultSchema.parse(input)).toEqual(input);
        });

        it('parses a clear-result request', () => {
            const input = { ...base, result: '' as const };
            expect(RoundRobinAdminSetResultSchema.parse(input)).toEqual(input);
        });

        it('parses a url-only request', () => {
            const input = { ...base, url: 'https://lichess.org/abc123' };
            expect(RoundRobinAdminSetResultSchema.parse(input)).toEqual(input);
        });

        it('parses COMPLETE startsAt', () => {
            const input = {
                ...base,
                startsAt: 'COMPLETE_2024-06-01T00:00:00.000Z',
                result: '0-1' as const,
            };
            expect(RoundRobinAdminSetResultSchema.parse(input)).toEqual(input);
        });

        it('rejects when neither result nor url is provided', () => {
            const result = RoundRobinAdminSetResultSchema.safeParse(base);
            expect(result.success).toBe(false);
        });

        it('rejects WAITING startsAt', () => {
            const result = RoundRobinAdminSetResultSchema.safeParse({
                ...base,
                startsAt: 'WAITING',
                result: '1-0',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid result values', () => {
            const result = RoundRobinAdminSetResultSchema.safeParse({
                ...base,
                result: '1-0F',
            });
            expect(result.success).toBe(false);
        });

        it('rejects non-positive round', () => {
            const result = RoundRobinAdminSetResultSchema.safeParse({
                ...base,
                round: 0,
                result: '1-0',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('RoundRobinAdminUpdatePlayerSchema', () => {
        const base = {
            cohort: '1500-1600',
            startsAt: 'WAITING',
            username: 'alice',
            displayName: 'Alice',
            lichessUsername: 'alice_l',
            chesscomUsername: 'alice_c',
            discordUsername: 'alice_d',
            discordId: '123',
        };

        it('parses a valid update for waitlist', () => {
            expect(RoundRobinAdminUpdatePlayerSchema.parse(base)).toEqual(base);
        });

        it('parses ACTIVE and COMPLETE startsAt', () => {
            expect(
                RoundRobinAdminUpdatePlayerSchema.parse({
                    ...base,
                    startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                }).startsAt,
            ).toBe('ACTIVE_2024-06-01T00:00:00.000Z');
            expect(
                RoundRobinAdminUpdatePlayerSchema.parse({
                    ...base,
                    startsAt: 'COMPLETE_2024-06-01T00:00:00.000Z',
                }).startsAt,
            ).toBe('COMPLETE_2024-06-01T00:00:00.000Z');
        });

        it('rejects empty displayName', () => {
            const result = RoundRobinAdminUpdatePlayerSchema.safeParse({
                ...base,
                displayName: '',
            });
            expect(result.success).toBe(false);
        });

        it('rejects missing username', () => {
            const { username: _username, ...rest } = base;
            const result = RoundRobinAdminUpdatePlayerSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
    });
});
