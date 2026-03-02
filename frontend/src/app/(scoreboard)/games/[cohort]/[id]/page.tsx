import { getGame } from '@/api/gameApi';
import { defaultMetadata } from '@/app/(scoreboard)/defaultMetadata';
import { getConfig } from '@/config';
import { Game, GameResult } from '@/database/game';
import GamePage from '@/games/view/GamePage';
import { Chess } from '@jackstenglein/chess';
import { Metadata } from 'next';
import { Suspense } from 'react';

const config = getConfig();

export function generateStaticParams() {
    return [];
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ cohort: string; id: string }>;
}): Promise<Metadata> {
    const { cohort, id } = await params;
    let response;
    try {
        response = await getGame(cohort, id);
    } catch {
        return defaultMetadata;
    }
    const game = response.data;

    const chess = new Chess({ pgn: game.pgn });
    const move = chess.lastMove();
    chess.seek(move);
    const imageParams = new URLSearchParams({
        fen: chess.fen(),
        orientation: game.orientation || 'white',
        white: getPlayer(chess, 'White', 'WhiteElo'),
        black: getPlayer(chess, 'Black', 'BlackElo'),
        date: chess.header().getRawValue('Date'),
        lastMove: move ? `${move.from}${move.to}` : '',
        comment: '',
        theme: 'standard',
        piece: 'standard',
    });

    const imageUrl = `${config.api.baseUrl}/public/pgn-export/image?${imageParams.toString()}`;
    return {
        title: `${game.headers.White || 'NN'} vs ${game.headers.Black || 'NN'} • ChessDojo.club`,
        description: getDescription(game, chess),
        openGraph: {
            ...defaultMetadata.openGraph,
            images: [imageUrl],
        },
        twitter: {
            ...defaultMetadata.twitter,
            card: 'summary',
            images: imageUrl,
        },
    };
}

function getDescription(game: Game, chess: Chess): string {
    const white = getPlayer(chess, 'White', 'WhiteElo');
    const black = getPlayer(chess, 'Black', 'BlackElo');
    let result = `${white} played ${black} in a game of chess.`;
    if (game.headers.Result === GameResult.White) {
        result += ` White won`;
    } else if (game.headers.Result === GameResult.Black) {
        result += ` Black won`;
    } else {
        result += ` They drew`;
    }
    result += ` after ${Math.ceil(chess.plyCount() / 2)} moves. Replay, analyze, and discuss the game!`;
    return result;
}

function getPlayer(chess: Chess, key: 'White' | 'Black', eloKey: 'WhiteElo' | 'BlackElo'): string {
    const player = chess.header().getRawValue(key);
    const elo = chess.header().getRawValue(eloKey);
    if (player) {
        let result = player;
        if (elo) {
            result += ` (${elo})`;
        }
        return result;
    }
    return 'NN';
}

export default async function Page(props: { params: Promise<{ cohort: string; id: string }> }) {
    const params = await props.params;

    const { cohort, id } = params;

    return (
        <Suspense>
            <GamePage cohort={cohort} id={id} />
        </Suspense>
    );
}
