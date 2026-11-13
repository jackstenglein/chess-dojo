'use client';

import { anton } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { Box, Stack, Typography } from '@mui/material';
import {
    Body,
    Condensed,
    HAIRLINE,
    Heading,
    INK_RAISED,
    MUTED,
    ORANGE,
    revealSx,
    Section,
} from '../../class/sections/shared';
import { Prizes as PrizesConfig, SenseiPick } from '../config';
import { PRIZES_SECTION, SCORECARD, SCORING, SENSEI_SECTION } from '../content';
import { Draft, draftValues } from '../prediction';

/** The five questions and their points, with the visitor's own answers filled in once they have any. */
export function Scoring({ draft }: { draft: Draft }) {
    const picks = draftValues(draft);

    return (
        <Section maxWidth='md'>
            <Heading sx={{ mb: { xs: 3, md: 5 } }}>{SCORING.heading}</Heading>
            <Box
                component='table'
                sx={{
                    ...revealSx,
                    width: 1,
                    borderCollapse: 'collapse',
                    '& th, & td': {
                        py: { xs: 1.5, md: 1.75 },
                        borderBottom: `1px solid ${HAIRLINE}`,
                        verticalAlign: 'baseline',
                    },
                }}
            >
                <Box component='thead' sx={visuallyHidden}>
                    <tr>
                        <th scope='col'>Question</th>
                        <th scope='col'>Points</th>
                    </tr>
                </Box>
                <tbody>
                    {SCORING.rows.map((row, index) => (
                        <tr key={row.question}>
                            <Box component='th' scope='row' sx={{ textAlign: 'left', pr: 2 }}>
                                <Stack direction='row' sx={{ gap: 1.5, alignItems: 'baseline' }}>
                                    <Condensed
                                        component='span'
                                        sx={{ color: ORANGE, minWidth: '1ch' }}
                                    >
                                        {index + 1}
                                    </Condensed>
                                    <Box>
                                        <Condensed component='span'>{row.question}</Condensed>
                                        {picks[index] && (
                                            <Typography
                                                variant='body2'
                                                sx={{ color: ORANGE, fontWeight: 600 }}
                                            >
                                                {SCORECARD.yourPick(picks[index])}
                                            </Typography>
                                        )}
                                        {row.note && (
                                            <Typography
                                                variant='body2'
                                                sx={{ color: MUTED, fontWeight: 400 }}
                                            >
                                                {row.note}
                                            </Typography>
                                        )}
                                    </Box>
                                </Stack>
                            </Box>
                            <Box component='td' sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <Condensed component='span' sx={{ fontSize: '1.7rem' }}>
                                    {row.points}
                                </Condensed>
                            </Box>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <Box
                            component='th'
                            scope='row'
                            sx={{ textAlign: 'left', borderBottom: '0 !important' }}
                        >
                            <Condensed component='span' sx={{ color: MUTED }}>
                                {SCORING.maximumLabel}
                            </Condensed>
                        </Box>
                        <Box
                            component='td'
                            sx={{ textAlign: 'right', borderBottom: '0 !important' }}
                        >
                            <Typography
                                component='span'
                                sx={{
                                    fontFamily: (theme) => fontFamily(theme, anton),
                                    fontSize: '2.75rem',
                                    lineHeight: 1,
                                    color: ORANGE,
                                }}
                            >
                                {SCORING.maximum}
                            </Typography>
                        </Box>
                    </tr>
                </tfoot>
            </Box>
            <Body sx={{ mt: 3, color: 'common.white' }}>{SCORING.tieRule}</Body>
            {SCORING.notes.map((note) => (
                <Body key={note} sx={{ mt: 1.25, fontSize: '1rem' }}>
                    {note}
                </Body>
            ))}
        </Section>
    );
}

const visuallyHidden = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
} as const;

/** Renders nothing until Kostya confirms the prizes in config.ts. */
export function Prizes({ prizes }: { prizes: PrizesConfig }) {
    if (!prizes.confirmed) {
        return null;
    }
    return (
        <Section maxWidth='md' sx={{ pt: 0 }}>
            <Heading sx={{ mb: { xs: 3, md: 5 } }}>{PRIZES_SECTION.heading}</Heading>
            <Stack sx={{ gap: 1.5 }}>
                {prizes.places.map((item) => (
                    <Box
                        key={item.place}
                        sx={{
                            ...revealSx,
                            p: { xs: 2.25, md: 3 },
                            borderRadius: 3,
                            bgcolor: INK_RAISED,
                            border: `1px solid ${HAIRLINE}`,
                        }}
                    >
                        <Condensed
                            sx={{
                                color: ORANGE,
                                fontSize: '1rem',
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                            }}
                        >
                            {item.place}
                        </Condensed>
                        <Condensed component='h3' sx={{ mt: 0.5, fontSize: '1.7rem' }}>
                            {item.prize}
                        </Condensed>
                        {item.detail && <Body sx={{ mt: 0.5 }}>{item.detail}</Body>}
                    </Box>
                ))}
            </Stack>
        </Section>
    );
}

/** Renders nothing until the senseis send their picks. */
export function SenseiPicks({ picks }: { picks: SenseiPick[] }) {
    if (picks.length === 0) {
        return null;
    }
    return (
        <Section sx={{ pt: 0 }}>
            <Heading sx={{ mb: { xs: 3, md: 5 } }}>{SENSEI_SECTION.heading}</Heading>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: `repeat(${Math.min(3, picks.length)}, 1fr)`,
                    },
                    gap: 2,
                }}
            >
                {picks.map((item) => (
                    <Box
                        key={item.name}
                        component='figure'
                        sx={{
                            ...revealSx,
                            m: 0,
                            p: { xs: 2.25, md: 3 },
                            borderRadius: 3,
                            bgcolor: INK_RAISED,
                            border: `1px solid ${HAIRLINE}`,
                        }}
                    >
                        <Condensed
                            component='figcaption'
                            sx={{ color: MUTED, fontSize: '1.15rem' }}
                        >
                            {item.name}
                        </Condensed>
                        <Condensed sx={{ mt: 0.5, fontSize: '1.9rem', color: ORANGE }}>
                            {item.pick}
                        </Condensed>
                        <Box component='blockquote' sx={{ m: 0, mt: 1 }}>
                            <Body sx={{ color: 'common.white' }}>{item.reason}</Body>
                        </Box>
                    </Box>
                ))}
            </Box>
        </Section>
    );
}
