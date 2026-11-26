import { EventType, trackEvent } from '@/analytics/events';
import { Check, ContentCopy } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { COUPON } from '../content';
import { EASE_OUT } from './motion';
import { secondaryButtonSx, SUCCESS } from './parts';

const COPIED_MS = 2400;

/**
 * Copies the code and says so for a moment. Stripe's checkout cannot be opened with
 * a code filled in, so the page makes carrying it over one tap.
 */
export function useCopyCode(placement: string) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(COUPON.code);
        } catch {
            // The code is on screen, so a blocked clipboard costs nothing.
            return;
        }
        trackEvent(EventType.RushDemoCodeCopy, { placement });
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    };

    return { copied, copy: () => void copy() };
}

/** The two icons share one box and trade places, so the label does not jump. */
export function CopyIcon({ copied }: { copied: boolean }) {
    const iconSx = (shown: boolean) => ({
        gridArea: '1 / 1',
        fontSize: '1.25rem',
        opacity: shown ? 1 : 0,
        transform: shown ? 'scale(1)' : 'scale(0.6)',
        filter: shown ? 'blur(0)' : 'blur(2px)',
        transition: `opacity 180ms ease, transform 220ms ${EASE_OUT}, filter 180ms ease`,
    });
    return (
        <Box component='span' aria-hidden sx={{ display: 'inline-grid', placeItems: 'center' }}>
            <ContentCopy sx={iconSx(!copied)} />
            <Check sx={{ ...iconSx(copied), color: SUCCESS }} />
        </Box>
    );
}

export function CopyCodeButton({ placement }: { placement: string }) {
    const { copied, copy } = useCopyCode(placement);
    return (
        <Button
            variant='outlined'
            onClick={copy}
            startIcon={<CopyIcon copied={copied} />}
            sx={{ ...secondaryButtonSx, minHeight: 48, flexShrink: 0, whiteSpace: 'nowrap' }}
        >
            {copied ? 'Copied' : 'Copy code'}
        </Button>
    );
}
