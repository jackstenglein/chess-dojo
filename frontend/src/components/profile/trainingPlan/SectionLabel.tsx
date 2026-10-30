import { Typography } from '@mui/material';

/** A form section's label: small, semibold capitals. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            variant='caption'
            sx={{
                color: 'text.secondary',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
            }}
        >
            {children}
        </Typography>
    );
}
