import { Link } from '@/components/navigation/Link';
import { TrainingPlanIcon } from '@/components/profile/trainingPlan/TrainingPlanIcon';
import { RequirementCategory } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { CategoryColors } from '@/style/ThemeProvider';
import { Box, CardActionArea, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

/** How wide the game card grows, so it stays game-sized on wide screens. */
const CARD_MAX_WIDTH = 480;

interface GameNewsfeedItemProps {
    entry: TimelineEntry;
}

/** Each side's score from a PGN result: "1-0" gives white 1 and black 0. */
function getScores(result?: string): { white: string; black: string } | undefined {
    switch (result) {
        case '1-0':
            return { white: '1', black: '0' };
        case '0-1':
            return { white: '0', black: '1' };
        case '1/2-1/2':
            return { white: '½', black: '½' };
    }
    return undefined;
}

/**
 * A published game analysis: a heading, then a small card for the game, with a
 * line per player and their score, that opens the game.
 */
const GameNewsfeedItem: React.FC<GameNewsfeedItemProps> = ({ entry }) => {
    const t = useTranslations('newsfeed.game');
    const headers = entry.gameInfo?.headers;
    const gameUrl = `/games/${entry.cohort.replaceAll('+', '%2B')}/${entry.gameInfo?.id.replaceAll('?', '%3F')}`;
    const scores = getScores(headers?.Result);
    const moves = headers?.PlyCount ? Math.ceil(parseInt(headers.PlyCount) / 2) : undefined;
    const color = CategoryColors[RequirementCategory.Games];

    return (
        <Stack spacing={1}>
            <Stack direction='row' sx={{ alignItems: 'center', gap: 0.75 }}>
                <TrainingPlanIcon
                    category={RequirementCategory.Games}
                    sx={{ fontSize: '1.1rem', color }}
                />
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.3 }}>
                    {t.rich('publishedAnalysis', { link: (chunks: ReactNode) => chunks })}
                </Typography>
            </Stack>

            <CardActionArea
                component={Link}
                href={gameUrl}
                sx={{
                    maxWidth: CARD_MAX_WIDTH,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                    '&:hover': { borderColor: 'text.secondary' },
                }}
                data-testid='game-newsfeed-card'
            >
                <Stack spacing={0.5}>
                    <PlayerLine
                        side='white'
                        name={headers?.White}
                        elo={headers?.WhiteElo}
                        score={scores?.white}
                    />
                    <PlayerLine
                        side='black'
                        name={headers?.Black}
                        elo={headers?.BlackElo}
                        score={scores?.black}
                    />
                    {(headers?.Date || moves) && (
                        <Typography variant='caption' sx={{ color: 'text.secondary', pt: 0.25 }}>
                            {[headers?.Date, moves && t('moveCount', { count: moves })]
                                .filter(Boolean)
                                .join(' · ')}
                        </Typography>
                    )}
                </Stack>
            </CardActionArea>
        </Stack>
    );
};

/** One player: a square in their colour, their name and rating, and their score. */
function PlayerLine({
    side,
    name,
    elo,
    score,
}: {
    side: 'white' | 'black';
    name?: string;
    elo?: string;
    score?: string;
}) {
    const won = score === '1';
    return (
        <Stack direction='row' sx={{ alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box
                sx={{
                    width: 12,
                    height: 12,
                    borderRadius: 0.5,
                    flexShrink: 0,
                    border: 1,
                    borderColor: 'text.secondary',
                    backgroundColor: side === 'white' ? '#f0f0f0' : '#1a1a1a',
                }}
            />
            <Typography variant='body2' noWrap sx={{ fontWeight: won ? 600 : 400, minWidth: 0 }}>
                {name || '?'}
            </Typography>
            {elo && (
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {elo}
                </Typography>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {score && (
                <Typography
                    variant='body2'
                    sx={{
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        color: won ? 'text.primary' : 'text.secondary',
                    }}
                >
                    {score}
                </Typography>
            )}
        </Stack>
    );
}

export default GameNewsfeedItem;
