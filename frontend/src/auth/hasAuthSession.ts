import { fetchAuthSession } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from './amplifyServerUtils';

/**
 * True when the request carries a Cognito access token and id token.
 * Failures are treated as signed-out so public pages still render.
 */
export async function hasAuthSession(): Promise<boolean> {
    try {
        return await runWithAmplifyServerContext({
            nextServerContext: { cookies },
            operation: async (contextSpec) => {
                const session = await fetchAuthSession(contextSpec);
                return (
                    session.tokens?.accessToken !== undefined &&
                    session.tokens?.idToken !== undefined
                );
            },
        });
    } catch {
        return false;
    }
}
