/**
 * Typed environment variables for Playwright tests.
 */
const env = {
    /** Base URL for API requests */
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',

    /** Number of cohorts in the system */
    numCohorts: parseInt(process.env.NUM_COHORTS ?? '23', 10),

    /** Test user credentials */
    username: process.env.TEST_ACCOUNT_USERNAME ?? '',
    email: process.env.TEST_ACCOUNT_EMAIL ?? '',
    password: process.env.TEST_ACCOUNT_PASSWORD ?? '',
};

/**
 * Get a typed environment variable.
 * Throws if the variable is required but not set.
 */
export function getEnv<K extends keyof typeof env>(name: K): (typeof env)[K] {
    const value = env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
