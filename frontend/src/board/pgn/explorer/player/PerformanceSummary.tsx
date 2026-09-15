import { GameData, PerformanceData } from '@/database/explorer';
import { GameResult } from '@/database/game';
import { OpenInNew } from '@mui/icons-material';
import {
    Link,
    styled,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableRow,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { Color } from './PlayerSource';

const StyledTableCell = styled(TableCell)(() => ({
    color: 'inherit',
}));

export function PerformanceSummary({ data }: { data?: PerformanceData }) {
    const t = useTranslations('analysisBoard.explorer.player');
    if (!data) {
        return null;
    }

    const totalGames = data.playerWins + data.playerLosses + data.playerDraws;
    const wins = data.playerWins;
    const draws = data.playerDraws;
    const losses = data.playerLosses;
    const score = wins + draws / 2;
    const percentage = totalGames > 0 ? Math.round((score / totalGames) * 1000) / 10 : undefined;
    return (
        <TableContainer
            sx={{
                border: '1px solid var(--mui-palette-TableCell-border)',
                borderRadius: 1,
            }}
        >
            <Table size='small'>
                <TableBody>
                    <TableRow>
                        <StyledTableCell>{t('performanceRatingLabel')}</StyledTableCell>
                        <StyledTableCell>{data.performanceRating}</StyledTableCell>
                    </TableRow>
                    <TableRow>
                        <StyledTableCell>{t('avgOpponentRatingLabel')}</StyledTableCell>
                        <StyledTableCell>{data.averageOpponentRating}</StyledTableCell>
                    </TableRow>
                    <TableRow>
                        <StyledTableCell>{t('totalGamesLabel')}</StyledTableCell>
                        <StyledTableCell>{totalGames}</StyledTableCell>
                    </TableRow>
                    <TableRow>
                        <StyledTableCell>{t('resultsLabel')}</StyledTableCell>
                        <StyledTableCell>
                            {t('resultsDisplay', { wins, losses, draws })}
                        </StyledTableCell>
                    </TableRow>
                    <TableRow>
                        <StyledTableCell>{t('scoreLabel')}</StyledTableCell>
                        <StyledTableCell>
                            {percentage !== undefined
                                ? t('scoreDisplay', { score, totalGames, percentage })
                                : `${score} / ${totalGames}`}
                        </StyledTableCell>
                    </TableRow>
                    <TableRow>
                        <StyledTableCell>{t('lastPlayedLabel')}</StyledTableCell>
                        <GameMetadata game={data.lastPlayed} showResult showRating />
                    </TableRow>
                    {data.bestWin && (
                        <TableRow>
                            <StyledTableCell>{t('bestWinLabel')}</StyledTableCell>
                            <GameMetadata game={data.bestWin} showRating />
                        </TableRow>
                    )}
                    {data.worstLoss && (
                        <TableRow>
                            <StyledTableCell>{t('worstLossLabel')}</StyledTableCell>
                            <GameMetadata game={data.worstLoss} showRating />
                        </TableRow>
                    )}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <StyledTableCell colSpan={2} sx={{ borderBottom: 0 }}>
                            {t.rich('performanceRatingFooter', {
                                link: (chunks) => (
                                    <Link
                                        href='https://handbook.fide.com/chapter/B022017'
                                        target='_blank'
                                    >
                                        {chunks}
                                    </Link>
                                ),
                            })}
                        </StyledTableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </TableContainer>
    );
}

function GameMetadata({
    game,
    showResult,
    showRating,
}: {
    game: GameData;
    showResult?: boolean;
    showRating?: boolean;
}) {
    const t = useTranslations('analysisBoard.explorer.player');
    const result =
        game.result === GameResult.Draw
            ? t('drawResult')
            : (game.result === GameResult.White) === (game.playerColor === Color.White)
              ? t('winResult')
              : t('lossResult');

    let description = showResult ? result : '';
    if (showRating) {
        if (description) {
            description += ' ';
        }
        description += 'vs ';
        description +=
            game.playerColor === Color.White
                ? `${game.normalizedBlackElo}`
                : `${game.normalizedWhiteElo}`;
    }

    return (
        <StyledTableCell>
            {game.headers.Date} {description && <>({description})</>}{' '}
            <Link href={game.url} target='_blank'>
                <OpenInNew fontSize='inherit' sx={{ verticalAlign: 'middle' }} />
            </Link>
        </StyledTableCell>
    );
}
