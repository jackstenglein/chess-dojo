import { EventType } from '@/database/event';
import { Check } from '@mui/icons-material';
import { Box, FormControl, Menu, Select, Stack, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { UseEventEditorResponse } from '../useEventEditor';

const options = [
    'tomato',
    'flamingo',
    'banana',
    'sage',
    'basil',
    'peacock',
    'blueberry',
    'lavendar',
    'grape',
    'graphite',
    'coaching',
    'dojoOrange',
    'twitch',
    'youtube',
] as const;

type ColorOption = (typeof options)[number];

export function ColorFormSection({ editor }: { editor: UseEventEditorResponse }) {
    const t = useTranslations('calendar');
    const [open, setOpen] = useState(false);
    const anchorEl = useRef<HTMLElement>(null);

    const colorLabels = useMemo<Record<ColorOption, string>>(
        () => ({
            tomato: t('colorTomato'),
            flamingo: t('colorFlamingo'),
            banana: t('colorBanana'),
            sage: t('colorSage'),
            basil: t('colorBasil'),
            peacock: t('colorPeacock'),
            blueberry: t('colorBlueberry'),
            lavendar: t('colorLavendar'),
            grape: t('colorGrape'),
            graphite: t('colorGraphite'),
            coaching: t('colorCoaching'),
            dojoOrange: t('colorDojoOrange'),
            twitch: t('colorTwitch'),
            youtube: t('colorYoutube'),
        }),
        [t],
    );

    return (
        <>
            <FormControl>
                <Select
                    disabled={editor.type === EventType.Availability}
                    ref={anchorEl}
                    open={false}
                    onOpen={() => setOpen(true)}
                    value={editor.color}
                    renderValue={() => (
                        <Box
                            sx={{
                                backgroundColor: getColor(editor),
                                width: '24px',
                                aspectRatio: 1,
                                borderRadius: '50%',
                            }}
                        />
                    )}
                    displayEmpty={true}
                />
            </FormControl>

            <Menu anchorEl={anchorEl.current} open={open} onClose={() => setOpen(false)}>
                <Stack
                    direction='row'
                    sx={{
                        flexWrap: 'wrap',
                        gap: 0.75,
                        py: 0.5,
                        px: 1,
                        alignItems: 'center',
                    }}
                >
                    {options.map((option) => (
                        <Tooltip key={option} title={colorLabels[option]} disableInteractive>
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                }}
                            >
                                <Box
                                    onClick={() => {
                                        editor.setColor(`${option}.main`);
                                        setOpen(false);
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        backgroundColor: `${option}.main`,
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            width: '22px',
                                            height: '22px',
                                        },
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {getColor(editor) === `${option}.main` && (
                                        <Check fontSize='small' sx={{ color: 'white' }} />
                                    )}
                                </Box>
                            </Box>
                        </Tooltip>
                    ))}
                </Stack>
            </Menu>
        </>
    );
}

function getColor(editor: UseEventEditorResponse): string {
    if (editor.type === EventType.Availability) {
        return 'book.main';
    }

    if (editor.color) {
        return editor.color;
    }

    switch (editor.type) {
        case EventType.Dojo: {
            const location = editor.location.toLowerCase();
            if (location.includes('twitch')) return 'twitch.main';
            if (location.includes('youtube')) return 'youtube.main';
            return 'dojoOrange.main';
        }
        case EventType.Coaching:
            return 'coaching.main';
        case EventType.LectureTier:
            return 'sage.main';
        case EventType.GameReviewTier:
            return 'peacock.main';
    }
}
