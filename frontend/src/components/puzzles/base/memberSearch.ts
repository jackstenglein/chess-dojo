import { getUserPublic, searchUsers } from '@/api/userApi';
import { MemberMatch } from './puzzlebaseClient';

/** A Dojo username, which is the id the sign-in service gave the member. */
const USERNAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Finds Dojo members by what the user typed. The Dojo's "all" search matches the text anywhere in a
 * member's display name, Discord name or Lichess or Chess.com username. A pasted Dojo username is
 * looked up directly as well. Someone found both ways is listed once, with the exact username match
 * first.
 */
export async function searchMembersByName(query: string): Promise<MemberMatch[]> {
    const typed = query.trim();
    const [byName, byUsername] = await Promise.all([
        searchUsers(typed, ['all']).catch(() => []),
        USERNAME.test(typed)
            ? getUserPublic(typed)
                  .then((response) => response.data)
                  .catch(() => undefined)
            : Promise.resolve(undefined),
    ]);

    const found = new Map<string, MemberMatch>();
    for (const user of [byUsername, ...byName]) {
        if (user?.username && !found.has(user.username)) {
            found.set(user.username, {
                username: user.username,
                displayName: user.displayName || user.username,
                dojoCohort: user.dojoCohort,
            });
        }
    }
    return [...found.values()];
}
