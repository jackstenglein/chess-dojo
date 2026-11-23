/**
 * Runs the wcLive handlers on a laptop, for testing the live page without
 * deploying. Data is kept in memory and lost when the server stops.
 *
 *   cd backend && pnpm wc-live:local
 *
 * The page sends its normal Cognito token. This server reads the username from
 * it WITHOUT checking the signature, so it must never run anywhere but
 * localhost. Open ?game=0 to test with the replayed Game 0, and add
 * &as=<username> to act as that user, for example as=hellokostya for a sensei
 * or as=fan1 for a fan. The dev site cannot sign in with production accounts,
 * so this is how senseis are tested locally.
 */
process.env.WC_LIVE_STORE = 'memory';
process.env.stage = process.env.stage || 'local';

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createServer, IncomingMessage, ServerResponse } from 'http';

type Handler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;

const PORT = parseInt(process.env.PORT || '4100');
const HOST = '127.0.0.1';

async function loadRoutes() {
    // Imported after the environment is set, since the modules read it on load.
    const read = await import('./read');
    const guess = await import('./guess');
    const evalHandler = await import('./eval');
    const roster = await import('./roster');
    const analysis = await import('./analysis');
    const games = await import('./customGames');
    const stats = await import('./stats');
    const routes: { method: string; pattern: RegExp; handler: Handler }[] = [
        {
            method: 'GET',
            pattern: /^\/public\/wc-live\/rounds\/(?<roundId>[^/]+)\/evals$/,
            handler: read.evals as unknown as Handler,
        },
        {
            method: 'GET',
            pattern: /^\/public\/wc-live\/rounds\/(?<roundId>[^/]+)\/leaderboard$/,
            handler: read.leaderboard as unknown as Handler,
        },
        {
            method: 'GET',
            pattern: /^\/wc-live\/rounds\/(?<roundId>[^/]+)\/guesses$/,
            handler: read.myGuesses as unknown as Handler,
        },
        {
            method: 'PUT',
            pattern: /^\/wc-live\/guess$/,
            handler: guess.handler as unknown as Handler,
        },
        {
            method: 'PUT',
            pattern: /^\/wc-live\/eval$/,
            handler: evalHandler.handler as unknown as Handler,
        },
        {
            method: 'GET',
            pattern: /^\/wc-live\/rounds\/(?<roundId>[^/]+)\/stats$/,
            handler: stats.handler as unknown as Handler,
        },
        {
            method: 'GET',
            pattern: /^\/public\/wc-live\/games$/,
            handler: games.list as unknown as Handler,
        },
        {
            method: 'POST',
            pattern: /^\/wc-live\/games$/,
            handler: games.add as unknown as Handler,
        },
        {
            method: 'PUT',
            pattern: /^\/wc-live\/games\/remove$/,
            handler: games.remove as unknown as Handler,
        },
        {
            method: 'GET',
            pattern: /^\/wc-live\/rounds\/(?<roundId>[^/]+)\/analysis$/,
            handler: analysis.get as unknown as Handler,
        },
        {
            method: 'PUT',
            pattern: /^\/wc-live\/analysis$/,
            handler: analysis.put as unknown as Handler,
        },
        {
            method: 'PUT',
            pattern: /^\/wc-live\/roster$/,
            handler: roster.handler as unknown as Handler,
        },
    ];
    return routes;
}

/** The claims of a JWT, read without verifying it. Local testing only. */
function unverifiedClaims(authorization: string | undefined): Record<string, unknown> | undefined {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    const payload = token?.split('.')[1];
    if (!payload) {
        return undefined;
    }
    try {
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
            string,
            unknown
        >;
    } catch {
        return undefined;
    }
}

function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: Buffer) => (body += chunk.toString('utf8')));
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

function cors(res: ServerResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Wc-Live-As');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
}

async function main() {
    const routes = await loadRoutes();

    const server = createServer((req, res) => {
        void (async () => {
            cors(res);
            if (req.method === 'OPTIONS') {
                res.writeHead(204).end();
                return;
            }
            const url = new URL(req.url ?? '/', `http://${HOST}`);
            const route = routes.find(
                (r) => r.method === req.method && r.pattern.test(url.pathname),
            );
            if (!route) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Not found' }));
                return;
            }

            // X-Wc-Live-As lets the page act as any user, to test senseis and
            // fans without their logins. It only exists on this local server.
            const actAs = req.headers['x-wc-live-as'];
            const claims = url.pathname.startsWith('/public/')
                ? undefined
                : typeof actAs === 'string' && /^[A-Za-z0-9_.@+-]{1,64}$/.test(actAs)
                  ? { 'cognito:username': actAs }
                  : unverifiedClaims(req.headers.authorization);
            if (!url.pathname.startsWith('/public/') && !claims) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Unauthorized' }));
                return;
            }

            const event = {
                rawPath: url.pathname,
                pathParameters: route.pattern.exec(url.pathname)?.groups ?? {},
                body:
                    req.method === 'PUT' || req.method === 'POST' ? await readBody(req) : undefined,
                headers: req.headers,
                requestContext: { authorizer: { jwt: { claims } } },
            } as unknown as APIGatewayProxyEventV2;

            const started = Date.now();
            const result = await route.handler(event);
            const out =
                typeof result === 'string'
                    ? { statusCode: 200, body: result }
                    : { statusCode: result.statusCode ?? 200, body: result.body ?? '' };
            const who = (claims?.['cognito:username'] as string | undefined) ?? '-';
            console.log(
                `${req.method} ${url.pathname} ${who} -> ${out.statusCode} (${Date.now() - started}ms)`,
            );
            res.writeHead(out.statusCode, { 'Content-Type': 'application/json' });
            res.end(out.body);
        })().catch((err: unknown) => {
            console.error(err);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
            }
            res.end(JSON.stringify({ message: 'Local server error' }));
        });
    });

    server.listen(PORT, HOST, () => {
        console.log(`wcLive local server on http://localhost:${PORT} (in-memory)`);
        console.log('Open /world-championship/live?game=0 to test with the replayed Game 0');
    });
}

void main();
