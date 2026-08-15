import { getRecording } from '@/api/liveClassesApi';
import { useAuth } from '@/auth/Auth';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    LiveClassRecording,
    SAMPLE_LIVE_CLASS_S3_KEY,
} from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { useCallback, useState } from 'react';

interface PresignedUrlData {
    loading?: boolean;
    url?: string;
}

/**
 * Manages playback state and access control for live class recordings.
 */
export function useLiveClassPlayback() {
    const [playingUrl, setPlayingUrl] = useState<string>();
    const [showUpsell, setShowUpsell] = useState<SubscriptionTier>();
    const [presignedUrls, setPresignedUrls] = useState<Record<string, PresignedUrlData>>({});
    const { user } = useAuth();
    const subscriptionTier = getSubscriptionTier(user);

    const getPresignedLink = useCallback(
        async (s3Key: string, tier: SubscriptionTier) => {
            if (s3Key !== SAMPLE_LIVE_CLASS_S3_KEY) {
                if (
                    tier === SubscriptionTier.GameReview &&
                    subscriptionTier !== SubscriptionTier.GameReview
                ) {
                    setShowUpsell(SubscriptionTier.GameReview);
                    return;
                }

                if (
                    subscriptionTier !== SubscriptionTier.Lecture &&
                    subscriptionTier !== SubscriptionTier.GameReview
                ) {
                    setShowUpsell(SubscriptionTier.Lecture);
                    return;
                }
            }

            if (presignedUrls[s3Key]?.url) {
                return presignedUrls[s3Key]?.url;
            }

            try {
                setPresignedUrls((urls) => ({ ...urls, [s3Key]: { loading: true } }));
                const resp = await getRecording({ s3Key });
                setPresignedUrls((urls) => ({ ...urls, [s3Key]: { url: resp.data.url } }));
                return resp.data.url;
            } catch (_err) {
                setPresignedUrls((urls) => ({ ...urls, [s3Key]: { loading: false } }));
            }
        },
        [presignedUrls, subscriptionTier],
    );

    const playRecording = useCallback(
        async (recording: LiveClassRecording, tier: SubscriptionTier) => {
            if (recording.url) {
                setPlayingUrl(recording.url);
                return;
            }

            const url = await getPresignedLink(recording.s3Key, tier);
            if (!url) {
                return;
            }
            setPlayingUrl(url);
        },
        [getPresignedLink],
    );

    const isRecordingLoading = (s3Key: string) => presignedUrls[s3Key]?.loading ?? false;

    return {
        playingUrl,
        setPlayingUrl,
        showUpsell,
        setShowUpsell,
        playRecording,
        isRecordingLoading,
    };
}
