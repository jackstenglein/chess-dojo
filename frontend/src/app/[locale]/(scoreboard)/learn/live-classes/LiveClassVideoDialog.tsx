import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { Dialog } from '@mui/material';
import { useTranslations } from 'next-intl';

const VIDEO_STYLE = {
    maxHeight: '100%',
    aspectRatio: '560 / 315',
    margin: 'auto',
    width: '100%',
    maxWidth: 'calc(min(100vw - 32px, (100vh - 64px) * 560 / 315))',
} as const;

/**
 * Renders the upsell dialog shown when a user lacks access to a live class recording.
 */
export function LiveClassUpsellDialog({
    showUpsell,
    onClose,
}: {
    showUpsell?: SubscriptionTier;
    onClose: () => void;
}) {
    const t = useTranslations('learn.liveClasses');

    if (!showUpsell) {
        return null;
    }

    return (
        <UpsellDialog
            open
            onClose={onClose}
            title={t('upsell.title')}
            description={t('upsell.description')}
            postscript={t('upsell.postscript')}
            currentAction={
                showUpsell === SubscriptionTier.GameReview
                    ? RestrictedAction.ViewGameAndProfileReviewRecording
                    : RestrictedAction.ViewGroupClassRecording
            }
            bulletPoints={
                showUpsell === SubscriptionTier.GameReview
                    ? [
                          t('upsell.gameReviewBullet1'),
                          t('upsell.gameReviewBullet2'),
                          t('upsell.gameReviewBullet3'),
                          t('upsell.gameReviewBullet4'),
                      ]
                    : [
                          t('upsell.lectureBullet1'),
                          t('upsell.lectureBullet2'),
                          t('upsell.lectureBullet3'),
                      ]
            }
        />
    );
}

/**
 * Renders a dialog for playing a live class recording.
 */
export function LiveClassVideoDialog({
    playingUrl,
    onClose,
    showUpsell,
    onCloseUpsell,
}: {
    playingUrl?: string;
    onClose: () => void;
    showUpsell?: SubscriptionTier;
    onCloseUpsell: () => void;
}) {
    return (
        <>
            {playingUrl && (
                <Dialog
                    open
                    onClose={onClose}
                    maxWidth={false}
                    slotProps={{
                        paper: {
                            sx: {
                                maxWidth: 'calc(min(100vw - 32px, (100vh - 64px) * 560 / 315))',
                                width: '100%',
                            },
                        },
                    }}
                >
                    {playingUrl.includes('youtube.com') ? (
                        <iframe
                            src={playingUrl}
                            title='YouTube video player'
                            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                            referrerPolicy='strict-origin-when-cross-origin'
                            allowFullScreen
                            style={VIDEO_STYLE}
                        />
                    ) : (
                        <video autoPlay controls src={playingUrl} style={VIDEO_STYLE} />
                    )}
                </Dialog>
            )}

            <LiveClassUpsellDialog showUpsell={showUpsell} onClose={onCloseUpsell} />
        </>
    );
}
