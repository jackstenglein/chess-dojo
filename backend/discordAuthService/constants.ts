/** The response from fetching a Discord access token. */
export interface DiscordTokenResponse {
    /** The access token for the user. */
    access_token: string;
    /** The type of the token. */
    token_type: string;
    /** How long until the token expires. */
    expires_in: number;
    /** The refresh token for the user. */
    refresh_token: string;
    /** The scope of the token. */
    scope: string;
}

/** The response from fetching a Discord user's identity. */
export interface DiscordUserResponse {
    /** The Discord id of the user. */
    id: string;
    /** The Discord username of the user. */
    username: string;
    /** The URL of the user's Discord profile picture. */
    avatar: string;
}

export const USER_TABLE = `${process.env.stage}-users`;
export const DISCORD_CLIENT_ID = process.env.discordClientId || '';
export const DISCORD_CLIENT_SECRET = process.env.discordClientSecret || '';
export const DISCORD_DEFAULT_REDIRECT_URI = `${process.env.frontendHost}/profile/edit`;
export const DISCORD_BOT_TOKEN = process.env.discordBotToken || '';
export const DISCORD_GUILD_ID = process.env.discordGuildId || '';
export const LIVE_CLASSES_ROLE_ID = process.env.discordLiveClassesRole || '';

export const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
export const DISCORD_USER_URL = 'https://discord.com/api/users/@me';
export const FREE_UNVERIFIED_ROLE_ID = '958008070817054790';

export const FreeCohortRoleId: Record<string, string> = {
    '0-300': '1347231021359431832',
    '300-400': '1347232898700542022',
    '400-500': '1347233681521246289',
    '500-600': '1347233929891020851',
    '600-700': '1347234137781567518',
    '700-800': '1347234570679881769',
    '800-900': '1347234797902106717',
    '900-1000': '1347234973698232404',
    '1000-1100': '1347235622636748892',
    '1100-1200': '1347236321915179050',
    '1200-1300': '1347236549292589186',
    '1300-1400': '1347237175481073746',
    '1400-1500': '1347236679034994800',
    '1500-1600': '1347237589429653545',
    '1600-1700': '1347237861795299379',
    '1700-1800': '1347238082146992198',
    '1800-1900': '1347238357155053611',
    '1900-2000': '1347238748538142793',
    '2000-2100': '1347238961252274197',
    '2100-2200': '1347239103904878715',
    '2200-2300': '1347239296448336033',
    '2300-2400': '1347239445308506215',
    '2400+': '1347240083052560415',
};

export const PaidCohortRoleId: Record<string, string> = {
    '0-300': '1107651005547548742',
    '300-400': '951960545077100645',
    '400-500': '951995036487254026',
    '500-600': '1107650883807891547',
    '600-700': '951995253378940999',
    '700-800': '1007088844425932820',
    '800-900': '951995299407212564',
    '900-1000': '1007089559550570578',
    '1000-1100': '951995406835925042',
    '1100-1200': '951995460174872586',
    '1200-1300': '951995519272624179',
    '1300-1400': '951996640271675403',
    '1400-1500': '951995556287377438',
    '1500-1600': '951995620049190942',
    '1600-1700': '951995656959058010',
    '1700-1800': '951995701909409862',
    '1800-1900': '951995756057882665',
    '1900-2000': '951995789935247441',
    '2000-2100': '951995832327086090',
    '2100-2200': '951995870264569916',
    '2200-2300': '951995912564121601',
    '2300-2400': '951995973385740329',
    '2400+': '951996035792764998',
};
