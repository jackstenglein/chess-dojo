'use client';

import { EventType, trackEvent } from '@/analytics/events';
import { metaLead } from '@/analytics/meta';
import { Link } from '@/components/navigation/Link';
import { Close, PlayArrowRounded } from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    FormControlLabel,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { classLeadSchema, getAttribution, grantClassAccess } from '../classLead';
import { ClassId } from '../content';
import { Body, Condensed, fontVars, INK_RAISED } from './shared';

const CLASS_NAMES: Record<ClassId, string> = {
    'logical-chess': 'Logical Chess Move by Move with GM Jesse Kraai',
    calculation: 'Calculation 1000+ with IM Kostya Kavutskiy',
    'game-review': 'Game & Profile Review with GM Jesse Kraai',
};

export function GateDialog({
    classId,
    onClose,
    onUnlocked,
}: {
    classId?: ClassId;
    onClose: () => void;
    onUnlocked: (classId: ClassId) => void;
}) {
    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [website, setWebsite] = useState('');
    const [errors, setErrors] = useState<{ email?: string; consent?: string }>({});
    const [loading, setLoading] = useState(false);
    // Keeps the class name on screen while the dialog fades out.
    const [lastClass, setLastClass] = useState<ClassId>('logical-chess');
    if (classId && classId !== lastClass) {
        setLastClass(classId);
    }

    const onSubmit = async (event: { preventDefault: () => void }) => {
        event.preventDefault();
        if (!classId) {
            return;
        }

        const lead = {
            email: email.trim(),
            classId,
            consent,
            attribution: getAttribution(),
            website,
        };
        const parsed = classLeadSchema.safeParse(lead);
        if (!parsed.success) {
            const fields = new Set(parsed.error.issues.map((issue) => issue.path[0]));
            setErrors({
                email: fields.has('email') ? 'Enter a valid email address.' : undefined,
                consent: fields.has('consent')
                    ? 'Tick the box to get the class and our emails.'
                    : undefined,
            });
            return;
        }

        setErrors({});
        setLoading(true);
        try {
            await fetch('/api/class-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lead),
            });
        } catch {
            // An email tool outage shouldn't cost this visitor the class they asked for.
        }
        setLoading(false);

        metaLead();
        trackEvent(EventType.ClassLead, { class_id: classId });
        grantClassAccess();
        onUnlocked(classId);
    };

    return (
        <Dialog
            open={!!classId}
            onClose={onClose}
            className='dark'
            sx={fontVars}
            aria-labelledby='class-gate-title'
            slotProps={{
                backdrop: { sx: { bgcolor: 'rgba(4, 4, 10, 0.82)', backdropFilter: 'blur(6px)' } },
                paper: {
                    sx: {
                        m: 2,
                        width: 1,
                        maxWidth: '30rem',
                        borderRadius: 3,
                        bgcolor: INK_RAISED,
                        backgroundImage: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        color: 'common.white',
                    },
                },
            }}
        >
            <IconButton
                aria-label='Close'
                onClick={onClose}
                sx={{ position: 'absolute', top: 6, right: 6, width: 44, height: 44 }}
            >
                <Close />
            </IconButton>

            <Stack
                component='form'
                noValidate
                onSubmit={(event) => void onSubmit(event)}
                sx={{ p: { xs: 3, sm: 4 }, pt: { xs: 5, sm: 5 }, gap: 2.25 }}
            >
                <Box>
                    <Condensed
                        component='h2'
                        sx={{ fontSize: '2.25rem', fontWeight: 500, lineHeight: 1.05 }}
                    >
                        <span id='class-gate-title'>Enter your email and the class starts</span>
                    </Condensed>
                    <Body sx={{ mt: 1, fontSize: '1.05rem' }}>
                        {CLASS_NAMES[lastClass]} plays right here. We’ll also email you the link so
                        you can finish it later.
                    </Body>
                </Box>

                <TextField
                    autoFocus
                    required
                    type='email'
                    label='Your email'
                    autoComplete='email'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    error={!!errors.email}
                    helperText={errors.email}
                />

                <Box
                    component='input'
                    aria-hidden
                    tabIndex={-1}
                    autoComplete='off'
                    name='website'
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    sx={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                />

                <Box>
                    <FormControlLabel
                        sx={{ alignItems: 'flex-start', m: 0 }}
                        control={
                            <Checkbox
                                checked={consent}
                                onChange={(event) => setConsent(event.target.checked)}
                                sx={{ p: 0, pr: 1, color: 'rgba(255,255,255,0.7)' }}
                            />
                        }
                        label={
                            <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Send me the class link and a few ChessDojo emails about classes and
                                training. Unsubscribe in one click. See the{' '}
                                <Link href='/privacy-policy' target='_blank'>
                                    privacy policy
                                </Link>
                                .
                            </Typography>
                        }
                    />
                    {errors.consent && (
                        <Typography
                            variant='caption'
                            color='error'
                            sx={{ display: 'block', mt: 0.5 }}
                        >
                            {errors.consent}
                        </Typography>
                    )}
                </Box>

                <Button
                    type='submit'
                    variant='contained'
                    color='dojoOrange'
                    size='large'
                    loading={loading}
                    startIcon={<PlayArrowRounded />}
                    sx={{ fontWeight: 600, fontSize: '1.05rem', minHeight: 52 }}
                >
                    Start the class
                </Button>
                <Typography
                    variant='caption'
                    sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}
                >
                    Free. You don&apos;t need a ChessDojo account.
                </Typography>
            </Stack>
        </Dialog>
    );
}
