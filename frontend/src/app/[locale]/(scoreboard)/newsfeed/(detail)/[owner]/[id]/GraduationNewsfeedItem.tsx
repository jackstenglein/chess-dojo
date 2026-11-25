import { ActivityHeading, ActivityPanel } from '@/components/newsfeed/ActivityPanel';
import { formatTime } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import CohortIcon from '@/scoreboard/CohortIcon';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

interface GraduationNewsfeedItemProps {
    entry: TimelineEntry;
}

/** The gold a graduation is celebrated in, on its tile and panel. */
const GRADUATION_GOLD = '#E0B042';

const richTags = {
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
};

/** A stat label without its trailing colon ("Dojo Score:" → "Dojo Score"). */
function label(text: string) {
    return text.replace(/\s*:\s*$/, '');
}

/**
 * A graduation, in the same panel as other entries but in gold: the new cohort's
 * badge, where they graduated from and into, and the numbers that got them there.
 * What the member wrote about it is shown above the panel, as the post's text.
 */
const GraduationNewsfeedItem: React.FC<GraduationNewsfeedItemProps> = ({ entry }) => {
    const t = useTranslations('newsfeed.graduation');
    const tCommon = useTranslations('common');
    const info = entry.graduationInfo;
    const newCohort = info?.newCohort || entry.cohort;

    const stats = info
        ? [
              {
                  label: label(t('dojoScore')),
                  value: `${Math.round(100 * info.dojoScore) / 100}`,
              },
              { label: label(t('dojoTime')), value: formatTime(info.dojoMinutes || 0, tCommon) },
              {
                  label: label(t('nonDojoTime')),
                  value: formatTime(info.nonDojoMinutes || 0, tCommon),
              },
              { label: label(t('gamesAnnotated')), value: `${info.gamesAnnotated ?? 0}` },
          ]
        : [];

    return (
        <Box
            sx={{
                borderRadius: 2,
                background: `linear-gradient(135deg, color-mix(in srgb, ${GRADUATION_GOLD} 14%, transparent), transparent 70%)`,
            }}
            data-testid='graduation-newsfeed-item'
        >
            <ActivityPanel>
                <ActivityHeading
                    icon={<CohortIcon cohort={newCohort} size={28} tooltip='' />}
                    color={GRADUATION_GOLD}
                    title={
                        info
                            ? t.rich('graduated', {
                                  ...richTags,
                                  oldCohort: entry.cohort,
                                  newCohort: info.newCohort,
                              })
                            : t.rich('graduatedFrom', { ...richTags, cohort: entry.cohort })
                    }
                />

                {stats.length > 0 && (
                    <Box
                        sx={{
                            display: 'grid',
                            // As many columns as fit, so the sidebar gets two and the feed four.
                            gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))',
                            gap: 1,
                        }}
                    >
                        {stats.map((stat) => (
                            <Stack
                                key={stat.label}
                                sx={{
                                    px: 1.25,
                                    py: 1,
                                    borderRadius: 1.5,
                                    backgroundColor: 'action.hover',
                                    minWidth: 0,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '1.05rem',
                                        lineHeight: 1.3,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {stat.value}
                                </Typography>
                                <Typography
                                    variant='caption'
                                    sx={{ color: 'text.secondary', lineHeight: 1.3 }}
                                    noWrap
                                >
                                    {stat.label}
                                </Typography>
                            </Stack>
                        ))}
                    </Box>
                )}
            </ActivityPanel>
        </Box>
    );
};

export default GraduationNewsfeedItem;
