import { useRequirements } from '@/api/cache/requirements';
import { Link } from '@/components/navigation/Link';
import { RequirementCategory } from '@/database/requirement';
import { ALL_COHORTS, User } from '@/database/user';
import { calculateTacticsRating } from '@/exams/view/exam';
import Icon from '@/style/Icon';
import { FiberManualRecord, FiberManualRecordOutlined } from '@mui/icons-material';
import { Box, Card, CardContent, Grid, Stack, Tooltip, Typography } from '@mui/material';
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

    const overallColor =
        tacticsRating.overall < minCohort
            ? 'error.main'
            : tacticsRating.overall > maxCohort
              ? 'success.main'
              : 'warning.main';

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
        <Card
            variant='outlined'
            sx={{
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: 1,
            }}
        >
            <Box sx={{ height: 4, bgcolor: overallColor }} />
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={2.5}>
                    <Stack
                        direction='row'
                        sx={{
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            rowGap: 1.5,
                        }}
                    >
                        <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    bgcolor: 'action.hover',
                                    flexShrink: 0,
                                }}
                            >
                                <Icon
                                    name={RequirementCategory.Tactics}
                                    color='primary'
                                    fontSize='medium'
                                />
                            </Box>
                            <Typography variant='h6' sx={{ fontWeight: 600 }}>
                                {t('tacticsRating')}
                            </Typography>
                            <Tooltip title={getTooltip(tacticsRating.overall, isProvisional)}>
                                <Typography
                                    sx={{
                                        fontSize: '1.5rem',
                                        letterSpacing: '-0.01em',
                                        lineHeight: 1,
                                        fontWeight: 'bold',
                                        color: overallColor,
                                        ml: 0.5,
                                    }}
                                >
                                    {Math.round(tacticsRating.overall)}
                                    {isProvisional && '?'}
                                </Typography>
                            </Tooltip>
                        </Stack>
                    </Stack>

                    <Box
                        sx={{
                            bgcolor: 'action.hover',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            px: { xs: 2, md: 3 },
                            py: 2,
                        }}
                    >
                        <Grid
                            container
                            columnSpacing={2}
                            sx={{
                                rowGap: 2,
                                justifyContent: 'space-evenly',
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
                                                variant='overline'
                                                sx={{
                                                    color: 'text.secondary',
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                <LinkIf to={c.link}>{c.name}</LinkIf>
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: '1.5rem',
                                                    letterSpacing: '-0.01em',
                                                    lineHeight: 1,
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                {c.rating > 0 ? Math.round(c.rating) : '?'}
                                                {c.provisional && '?'}
                                            </Typography>
                                            {c.examCount !== undefined && c.rating > 0 && (
                                                <Stack direction='row' sx={{ mt: 0.5 }}>
                                                    {[...Array(c.examCount).keys()].map((idx) => (
                                                        <FiberManualRecord
                                                            key={`taken-${idx}`}
                                                            sx={{
                                                                width: '0.7rem',
                                                                height: '0.7rem',
                                                                color: 'text.secondary',
                                                            }}
                                                        />
                                                    ))}
                                                    {[...Array(3 - c.examCount).keys()].map(
                                                        (idx) => (
                                                            <FiberManualRecordOutlined
                                                                key={`untaken-${idx}`}
                                                                sx={{
                                                                    width: '0.7rem',
                                                                    height: '0.7rem',
                                                                    color: 'text.secondary',
                                                                }}
                                                            />
                                                        ),
                                                    )}
                                                </Stack>
                                            )}
                                        </Stack>
                                    </Tooltip>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default TacticsScoreCard;

const LinkIf = ({ to, children }: { to?: string; children: ReactNode }) => {
    return to ? <Link href={to}>{children}</Link> : children;
};
