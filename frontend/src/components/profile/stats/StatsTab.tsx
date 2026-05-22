import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import {
    getRatingUsername,
    getSystemCurrentRating,
    getSystemStartRating,
    hideRatingUsername,
    RatingSystem,
    User,
} from '@/database/user';
import { RatingSystemIcon } from '@/style/RatingSystemIcons';
import { isCustom } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LoadingButton } from '@mui/lab';
import { Button, Card, CardContent, Stack, Tooltip, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import RatingCard from './RatingCard';
import TacticsScoreCard from './TacticsScoreCard';

const REFRESH_COOLDOWN_SECONDS = 60;

function lichessUsernameConfigured(user: User): boolean {
    const u = user.ratings[RatingSystem.Lichess]?.username?.trim();
    return Boolean(u);
}

interface StatsTabProps {
    user: User;
}

const StatsTab: React.FC<StatsTabProps> = ({ user }) => {
    const api = useApi();
    const { user: viewer } = useAuth();
    const lichessImportRequest = useRequest();
    const [hidden, setHidden] = useState(
        viewer?.enableZenMode && viewer.username === user.username,
    );
    const isOwnProfile = viewer?.username === user.username;

    const [cooldowns, setCooldowns] = useState<Partial<Record<RatingSystem, number>>>({});
    const [lichessImportCooldown, setLichessImportCooldown] = useState(0);
    const lichessCooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const intervalsRef = useRef<Map<RatingSystem, ReturnType<typeof setInterval>>>(new Map());

    useEffect(() => {
        return () => {
            intervalsRef.current.forEach((id) => clearInterval(id));
            if (lichessCooldownIntervalRef.current) {
                clearInterval(lichessCooldownIntervalRef.current);
            }
        };
    }, []);

    const handleLichessGamesImport = useCallback(async () => {
        if (lichessImportCooldown > 0) {
            return;
        }
        lichessImportRequest.onStart();
        try {
            await api.requestLichessPlaytimeImport();
            lichessImportRequest.onSuccess();
            setLichessImportCooldown(REFRESH_COOLDOWN_SECONDS);
            if (lichessCooldownIntervalRef.current) {
                clearInterval(lichessCooldownIntervalRef.current);
            }
            lichessCooldownIntervalRef.current = setInterval(() => {
                setLichessImportCooldown((s) => {
                    if (s <= 1) {
                        if (lichessCooldownIntervalRef.current) {
                            clearInterval(lichessCooldownIntervalRef.current);
                            lichessCooldownIntervalRef.current = null;
                        }
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);
        } catch (err) {
            lichessImportRequest.onFailure(err);
        }
    }, [api, lichessImportRequest]);

    const handleRefresh = useCallback(
        async (targetSystem: RatingSystem) => {
            const ratingsMap: Record<string, unknown> = {};
            for (const rs of Object.values(RatingSystem)) {
                if (user.ratings[rs]) {
                    ratingsMap[rs] = { ...user.ratings[rs] };
                }
            }
            ratingsMap[targetSystem] = {
                ...(ratingsMap[targetSystem] as object),
                currentRating: 0,
            };
            await api.updateUser({ ratings: ratingsMap } as Partial<User>);

            setCooldowns((prev) => ({ ...prev, [targetSystem]: REFRESH_COOLDOWN_SECONDS }));
            const intervalId = setInterval(() => {
                setCooldowns((prev) => {
                    const remaining = (prev[targetSystem] ?? 0) - 1;
                    if (remaining <= 0) {
                        clearInterval(intervalId);
                        intervalsRef.current.delete(targetSystem);
                        const { [targetSystem]: _, ...rest } = prev;
                        return rest;
                    }
                    return { ...prev, [targetSystem]: remaining };
                });
            }, 1000);
            intervalsRef.current.set(targetSystem, intervalId);
        },
        [api, user.ratings],
    );

    if (hidden) {
        return (
            <Stack spacing={2} alignItems='center'>
                <Typography>Ratings are hidden in Zen Mode.</Typography>
                <Button onClick={() => setHidden(false)}>View Anyway</Button>
            </Stack>
        );
    }

    const preferredSystem = user.ratingSystem;
    const currentRating = getSystemCurrentRating(user, preferredSystem);
    const startRating = getSystemStartRating(user, preferredSystem);

    return (
        <Stack spacing={4}>
            <RatingCard
                system={preferredSystem}
                cohort={user.dojoCohort}
                username={getRatingUsername(user, preferredSystem)}
                usernameHidden={hideRatingUsername(user, preferredSystem)}
                currentRating={currentRating}
                startRating={startRating}
                isPreferred={true}
                ratingHistory={
                    user.ratingHistories ? user.ratingHistories[preferredSystem] : undefined
                }
                name={user.ratings[preferredSystem]?.name}
                isProvisional={user.ratings[preferredSystem]?.isProvisional}
                onRefresh={
                    isOwnProfile && !isCustom(preferredSystem)
                        ? () => handleRefresh(preferredSystem)
                        : undefined
                }
                refreshCooldown={cooldowns[preferredSystem]}
            />

            {Object.values(RatingSystem).map((rs) => {
                if (rs === preferredSystem) {
                    return null;
                }

                const currentRating = getSystemCurrentRating(user, rs);
                const startRating = getSystemStartRating(user, rs);

                if (currentRating <= 0 && startRating <= 0) {
                    return null;
                }

                return (
                    <RatingCard
                        key={rs}
                        system={rs}
                        cohort={user.dojoCohort}
                        username={getRatingUsername(user, rs)}
                        usernameHidden={hideRatingUsername(user, rs)}
                        currentRating={currentRating}
                        startRating={startRating}
                        isPreferred={user.ratingSystem === rs}
                        ratingHistory={user.ratingHistories ? user.ratingHistories[rs] : undefined}
                        name={user.ratings[rs]?.name}
                        isProvisional={user.ratings[rs]?.isProvisional}
                        onRefresh={
                            isOwnProfile && !isCustom(rs) ? () => handleRefresh(rs) : undefined
                        }
                        refreshCooldown={cooldowns[rs]}
                    />
                );
            })}

            {isOwnProfile && lichessUsernameConfigured(user) && (
                <Card variant='outlined'>
                    <CardContent>
                        <Stack spacing={1.5}>
                            <Stack direction='row' spacing={1.5} alignItems='center'>
                                <RatingSystemIcon system={RatingSystem.Lichess} />
                                <Typography variant='h6'>Lichess games</Typography>
                            </Stack>
                            <Typography variant='body2' color='text.secondary'>
                                Pull your latest standard games into your training plan and activity
                                (same as the nightly sync). Ratings above still refresh separately.
                            </Typography>
                            <Tooltip
                                title={
                                    lichessImportCooldown
                                        ? `Try again in ${lichessImportCooldown}s`
                                        : 'Import recent Lichess games'
                                }
                            >
                                <span>
                                    <LoadingButton
                                        variant='outlined'
                                        size='small'
                                        startIcon={<RefreshIcon />}
                                        loading={lichessImportRequest.isLoading()}
                                        disabled={lichessImportCooldown > 0}
                                        onClick={() => void handleLichessGamesImport()}
                                    >
                                        Refresh games
                                    </LoadingButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <RequestSnackbar request={lichessImportRequest} />

            <TacticsScoreCard user={user} />
        </Stack>
    );
};

export default StatsTab;
