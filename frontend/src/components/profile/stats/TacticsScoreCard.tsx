import { useRequirements } from '@/api/cache/requirements';
import { Link } from '@/components/navigation/Link';
import { RequirementCategory } from '@/database/requirement';
import { ALL_COHORTS, User } from '@/database/user';
import { calculateTacticsRating } from '@/exams/view/exam';
import Icon from '@/style/Icon';
import { FiberManualRecord, FiberManualRecordOutlined } from '@mui/icons-material';
import { Card, CardContent, Grid, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

interface TacticsScoreCardProps {
    user: User;
}

const TacticsScoreCard: React.FC<TacticsScoreCardProps> = ({ user }) => {
    const t = useTranslations('profile.stats.tacticsCard');
    const { requirements } = useRequirements(ALL_COHORTS, true);
    const tacticsRating = calculateTacticsRating(user, requirements);
    const minCohort = parseInt(user.dojoCohort);
    const maxCohort =
        user.dojoCohort.split('-').length > 1 ? parseInt(user.dojoCohort.split('-')[1]) : minCohort;

    const isProvisional = tacticsRating.components.some((c) => c.rating < 0 || c.provisional);

    function getTooltip(rating: number, isProvisional: boolean): string {
        let tooltip = '';
        if (rating < minCohort) {
            tooltip = t('lowTooltip');
        } else if (rating > maxCohort) {
            tooltip = t('highTooltip');
        } else {
            tooltip = t('matchingTooltip');
        }

        if (isProvisional) {
            tooltip += t('provisionalSuffix');
        }

        return tooltip;
    }

    return (
        <Card variant='outlined'>
            <CardContent>
                <Stack
                    direction='row'
                    spacing={2}
                    sx={{
                        mb: 2,
                        justifyContent: 'start',
                        alignItems: 'center',
                    }}
                >
                    <Typography variant='h6'>
                        <Icon
                            name={RequirementCategory.Tactics}
                            color='primary'
                            fontSize='large'
                            sx={{ marginRight: 1.5, verticalAlign: 'middle' }}
                        />
                        {t('tacticsRating')}
                    </Typography>
                    <Tooltip title={getTooltip(tacticsRating.overall, isProvisional)}>
                        <Typography
                            variant='h6'
                            sx={{
                                fontSize: '2rem',
                                fontWeight: 'bold',
                            }}
                            color={
                                tacticsRating.overall < minCohort
                                    ? 'error'
                                    : tacticsRating.overall > maxCohort
                                      ? 'success.main'
                                      : 'warning.main'
                            }
                        >
                            {Math.round(tacticsRating.overall)}
                            {isProvisional && '?'}
                        </Typography>
                    </Tooltip>
                </Stack>

                <Grid
                    container
                    columnSpacing={2}
                    sx={{
                        rowGap: 4,
                        justifyContent: 'center',
                    }}
                >
                    {tacticsRating.components.map((c) => (
                        <Grid
                            key={c.name}
                            size={{
                                xs: 6,
                                sm: 3,
                                md: 'grow',
                            }}
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                            }}
                        >
                            <Tooltip title={c.description}>
                                <Stack
                                    sx={{
                                        alignItems: 'center',
                                    }}
                                >
                                    <Typography
                                        variant='body1'
                                        sx={{
                                            color: 'text.secondary',
                                        }}
                                    >
                                        <LinkIf to={c.link}>{c.name}</LinkIf>
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: '2rem',
                                            lineHeight: 1,
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {c.rating > 0 ? Math.round(c.rating) : '?'}
                                        {c.provisional && '?'}
                                    </Typography>
                                    {c.examCount !== undefined && c.rating > 0 && (
                                        <Typography
                                            variant='body2'
                                            sx={{
                                                color: 'text.secondary',
                                            }}
                                        >
                                            <Stack direction='row'>
                                                {[...Array(c.examCount).keys()].map((idx) => (
                                                    <FiberManualRecord
                                                        key={`taken-${idx}`}
                                                        sx={{
                                                            width: '0.85rem',
                                                            height: '0.85rem',
                                                        }}
                                                    />
                                                ))}
                                                {[...Array(3 - c.examCount).keys()].map((idx) => (
                                                    <FiberManualRecordOutlined
                                                        key={`untaken-${idx}`}
                                                        sx={{
                                                            width: '0.85rem',
                                                            height: '0.85rem',
                                                        }}
                                                    />
                                                ))}
                                            </Stack>
                                        </Typography>
                                    )}
                                </Stack>
                            </Tooltip>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default TacticsScoreCard;

const LinkIf = ({ to, children }: { to?: string; children: ReactNode }) => {
    return to ? <Link href={to}>{children}</Link> : children;
};
