import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import {
    getRatingUsername,
    getSystemCurrentRating,
    getSystemStartRating,
    hideRatingUsername,
    RatingSystem,
    User,
} from '@/database/user';
import { isCustom } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import { Button, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import RatingCard from './RatingCard';
import TacticsScoreCard from './TacticsScoreCard';

const REFRESH_COOLDOWN_SECONDS = 60;

interface StatsTabProps {
    user: User;
}

const StatsTab: React.FC<StatsTabProps> = ({ user }) => {
    const api = useApi();
    const { user: viewer } = useAuth();
    const [hidden, setHidden] = useState(
        viewer?.enableZenMode && viewer.username === user.username,
    );
    const isOwnProfile = viewer?.username === user.username;

    const [cooldowns, setCooldowns] = useState<Partial<Record<RatingSystem, number>>>({});
    const intervalsRef = useRef<Map<RatingSystem, ReturnType<typeof setInterval>>>(new Map());

    useEffect(() => {
        return () => {
            intervalsRef.current.forEach((id) => clearInterval(id));
        };
    }, []);

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

            <TacticsScoreCard user={user} />
        </Stack>
    );
};

export default StatsTab;
