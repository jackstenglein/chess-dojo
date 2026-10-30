import { Link } from '@/components/navigation/Link';
import {
    ActivityHeading,
    ActivityPanel,
    DojoPointsChange,
} from '@/components/newsfeed/ActivityPanel';
import { RequirementCategory } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { CategoryColors } from '@/style/ThemeProvider';
import { Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { FaChessBoard } from 'react-icons/fa';

interface GameNewsfeedItemProps {
    entry: TimelineEntry;
}

/** A player as "Name (rating)", or just the name when there's no rating. */
function player(name?: string, elo?: string) {
    return `${name || '?'}${elo ? ` (${elo})` : ''}`;
}

/**
 * A PGN time control in minutes, as players say it ("5400+30" is "90+30"), or
 * nothing when it isn't a single base and increment.
 */
export function formatTimeControl(timeControl?: string) {
    const match = /^(\d+)(?:\+(\d+))?$/.exec(timeControl ?? '');
    if (!match) {
        return '';
    }
    const base = parseInt(match[1]);
    const minutes = base % 60 === 0 ? `${base / 60}` : `${Math.round((base / 60) * 10) / 10}`;
    return match[2] ? `${minutes}+${match[2]}` : minutes;
}

/**
 * A published game analysis, in the same panel as a task entry: a chessboard on the
 * Games colour, the players as the title linking to the game, the result on the
 * right, the time control, opening and date underneath, then the points earned.
 */
const GameNewsfeedItem: React.FC<GameNewsfeedItemProps> = ({ entry }) => {
    const t = useTranslations('newsfeed.game');
    const headers = entry.gameInfo?.headers;
    const gameUrl = `/games/${entry.cohort.replaceAll('+', '%2B')}/${entry.gameInfo?.id.replaceAll('?', '%3F')}`;
    const result =
        headers?.Result && headers.Result !== '*' ? headers.Result.replaceAll('1/2', '½') : '';

    const details = [
        formatTimeControl(headers?.TimeControl),
        headers?.Opening ?? '',
        headers?.Date && !headers.Date.includes('?') ? headers.Date : '',
    ].filter(Boolean);

    return (
        <ActivityPanel>
            <ActivityHeading
                icon={<FaChessBoard size='0.85em' data-testid='game-newsfeed-icon' />}
                color={CategoryColors[RequirementCategory.Games]}
                title={
                    <Link
                        href={gameUrl}
                        underline='hover'
                        sx={{ color: 'inherit' }}
                        data-testid='game-newsfeed-players'
                    >
                        {t('versus', {
                            white: player(headers?.White, headers?.WhiteElo),
                            black: player(headers?.Black, headers?.BlackElo),
                        })}
                    </Link>
                }
                subtitle={t('newAnalysis')}
                aside={
                    result && (
                        <Typography
                            sx={{
                                flexShrink: 0,
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {result}
                        </Typography>
                    )
                }
            />
            {details.length > 0 && (
                <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                    data-testid='game-newsfeed-details'
                >
                    {details.join(' · ')}
                </Typography>
            )}
            {entry.dojoPoints > 0 && <DojoPointsChange entry={entry} />}
        </ActivityPanel>
    );
};

export default GameNewsfeedItem;
