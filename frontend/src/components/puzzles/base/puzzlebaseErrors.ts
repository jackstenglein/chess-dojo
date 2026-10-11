/**
 * Returns a message that is fit to show a user for an error from an API call. The puzzlebase API
 * puts a user-facing message in the body of its error responses.
 */
export function errorMessage(err: unknown): string {
    const fromApi = (err as { response?: { data?: { message?: unknown } } } | null)?.response?.data
        ?.message;
    if (typeof fromApi === 'string' && fromApi) {
        return fromApi;
    }
    if (err instanceof Error && err.message) {
        return err.message;
    }
    return 'Something went wrong. Please try again.';
}

/** Returns the HTTP status of an error from an API call, if it has one. */
export function errorStatus(err: unknown): number | undefined {
    return (err as { response?: { status?: number } } | null)?.response?.status;
}
