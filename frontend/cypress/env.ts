import { z } from 'zod';

export const EnvSchema = z.object({
    apiBaseUrl: z.string(),
    numCohorts: z.number(),
    cognito_region: z.string(),
    cognito_user_pool_id: z.string(),
    cognito_user_pool_web_client_id: z.string(),
    cognito_domain: z.string(),
    cognito_username: z.string(),
    cognito_password: z.string(),
    codeCoverage: z.object({
        exclude: z.string(),
    }),
    dev_username: z.string()
});

export type Env = z.infer<typeof EnvSchema>;
export type EnvVarName = keyof Env;
