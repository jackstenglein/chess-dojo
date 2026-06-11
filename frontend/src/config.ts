import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { z } from 'zod';
import { LogLevel } from './logging/logLevel';

export const MUI_LICENSE_KEY =
    '24a7fa97376749c937d182874ff9e0bcTz0xMjMxMjIsRT0xNzk3MjA2Mzk5MDAwLFM9cHJvLExNPXN1YnNjcmlwdGlvbixQVj1RMy0yMDI0LEtWPTI=';

export const EnvSchema = z.object({
    auth: z.object({
        region: z.literal('us-east-1'),
        userPoolId: z.string(),
        userPoolWebClientId: z.string(),
        oauth: z.object({
            domain: z.string(),
            scope: z
                .string()
                .transform((value) => value.split(',').map((v) => v.trim()))
                .pipe(z.string().array()),
            redirectSignIn: z.string(),
            redirectSignOut: z.string(),
            responseType: z.literal('code'),
        }),
    }),
    database: z.object({
        region: z.literal('us-east-1'),
        usersTable: z.string(),
    }),
    api: z.object({
        baseUrl: z.string(),
    }),
    media: z.object({
        picturesBucket: z.string(),
    }),
    stripe: z.object({
        publishableKey: z.string(),
        tiers: z.object({
            [SubscriptionTier.Basic]: z.object({
                /** The monthly price id. */
                month: z.string(),
                /** The yearly price id. */
                year: z.string(),
            }),
            [SubscriptionTier.Lecture]: z.object({
                /** The monthly price id. */
                month: z.string(),
                /** The yearly price id. */
                year: z.string(),
            }),
            [SubscriptionTier.GameReview]: z.object({
                /** The monthly price id. */
                month: z.string(),
                /** The yearly price id. */
                year: z.string(),
            }),
        }),
    }),
    baseUrl: z.string(),
    isBeta: z.boolean(),
    metaPixelId: z.string(),
    discord: z.object({
        url: z.string(),
        clientId: z.string(),
        oauthRedirectUrl: z.string(),
        guildId: z.string(),
    }),
    logLevel: z.enum(LogLevel),
});

export type Config = z.infer<typeof EnvSchema>;

export function getConfig(): Config {
    return EnvSchema.parse({
        auth: {
            region: process.env.NEXT_PUBLIC_AUTH_REGION,
            userPoolId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID,
            userPoolWebClientId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_WEB_CLIENT_ID,
            oauth: {
                domain: process.env.NEXT_PUBLIC_AUTH_OAUTH_DOMAIN,
                scope: process.env.NEXT_PUBLIC_AUTH_OAUTH_SCOPES,
                redirectSignIn: process.env.NEXT_PUBLIC_AUTH_OAUTH_REDIRECT_SIGN_IN,
                redirectSignOut: process.env.NEXT_PUBLIC_AUTH_OAUTH_REDIRECT_SIGN_OUT,
                responseType: process.env.NEXT_PUBLIC_AUTH_OAUTH_RESPONSE_TYPE,
            },
        },
        database: {
            region: process.env.NEXT_PUBLIC_DATABASE_REGION,
            usersTable: process.env.NEXT_PUBLIC_DATABASE_USERS_TABLE,
        },
        api: {
            baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
        },
        media: {
            picturesBucket: process.env.NEXT_PUBLIC_MEDIA_PICTURES_BUCKET,
        },
        stripe: {
            publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
            tiers: {
                [SubscriptionTier.Basic]: {
                    month: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
                    year: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
                },
                [SubscriptionTier.Lecture]: {
                    month: process.env.NEXT_PUBLIC_STRIPE_LECTURE_MONTHLY_PRICE_ID,
                    year: process.env.NEXT_PUBLIC_STRIPE_LECTURE_MONTHLY_PRICE_ID,
                },
                [SubscriptionTier.GameReview]: {
                    month: process.env.NEXT_PUBLIC_STRIPE_GAME_REVIEW_MONTHLY_PRICE_ID,
                    year: process.env.NEXT_PUBLIC_STRIPE_GAME_REVIEW_MONTHLY_PRICE_ID,
                },
            },
        },
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        isBeta: process.env.NEXT_PUBLIC_IS_BETA === 'true',
        metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
        discord: {
            url: process.env.NEXT_PUBLIC_DISCORD_URL,
            clientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
            oauthRedirectUrl: process.env.NEXT_PUBLIC_DISCORD_OAUTH_REDIRECT_URL,
            guildId: process.env.NEXT_PUBLIC_DISCORD_GUILD_ID,
        },
        logLevel: parseInt(process.env.NEXT_PUBLIC_LOG_LEVEL ?? ''),
    });
}
