import { isWcSensei } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import {
    customGamePgnUrl,
    MAX_CUSTOM_GAMES,
    parseLichessLink,
    WcAddGameRequestSchema,
    WcCustomGame,
    WcRemoveGameRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/wcLive/customGames';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
} from '../directoryService/api';
import { listCustomGames, ok, removeCustomGame, saveCustomGame } from './database';
import { clearCustomGameCache, parseRoundPgn } from './lichess';

/** GET /public/wc-live/games: the games senseis added, as tabs for everyone. */
export const list: APIGatewayProxyHandlerV2 = async () => {
    try {
        return ok({ games: await listCustomGames() });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

function requireSensei(event: Parameters<APIGatewayProxyHandlerV2>[0]): string {
    const { username } = requireUserInfo(event);
    if (!isWcSensei(username)) {
        throw new ApiError({ statusCode: 403, publicMessage: 'Only senseis can add games' });
    }
    return username;
}

/** The "White - Black" name of a game, from its PGN headers. */
function playersOf(pgn: string): string | undefined {
    const tag = (name: string) => new RegExp(`\\[${name} "([^"]*)"\\]`).exec(pgn)?.[1];
    const white = tag('White');
    const black = tag('Black');
    return white && black ? `${white.split(',')[0]} - ${black.split(',')[0]}` : undefined;
}

/**
 * POST /wc-live/games: a sensei adds a game from a Lichess link. The game is
 * checked on Lichess first, so a bad link fails here and not on the page.
 */
export const add: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const username = requireSensei(event);
        const request = parseBody(event, WcAddGameRequestSchema);
        const link = parseLichessLink(request.url);
        if (!link) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'Paste a Lichess game link, or a link to a broadcast round or board',
            });
        }

        const games = await listCustomGames();
        if (games.length >= MAX_CUSTOM_GAMES && !games.some((g) => g.id === link.id)) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: `There can be at most ${MAX_CUSTOM_GAMES} added games. Remove one first.`,
            });
        }

        const resp = await fetch(customGamePgnUrl(link));
        if (!resp.ok) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'Lichess does not have that game. Check the link.',
                privateMessage: `${customGamePgnUrl(link)}: ${resp.status}`,
            });
        }
        const pgn = (await resp.text()).split(/\n\s*\n(?=\[Event )/)[0];
        // Throws on a PGN the page could not follow either.
        parseRoundPgn(pgn);

        const game: WcCustomGame = {
            ...link,
            name: request.name || playersOf(pgn) || 'Lichess game',
            url: request.url,
            addedBy: username,
            addedAt: new Date().toISOString(),
        };
        await saveCustomGame(game);
        clearCustomGameCache();
        return ok({ game, games: await listCustomGames() });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** DELETE-style PUT /wc-live/games/remove: a sensei removes an added game's tab. */
export const remove: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        requireSensei(event);
        const { id } = parseBody(event, WcRemoveGameRequestSchema);
        await removeCustomGame(id);
        clearCustomGameCache();
        return ok({ games: await listCustomGames() });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
