import { Typography } from '@mui/material';

/**
 * The title of a card in the profile sidebar: a small icon and a semibold label,
 * matching the Heatmap card.
 */
export function CardTitle({
    icon,
    children,
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <Typography
            component='h2'
            sx={{
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                '& svg': { fontSize: '1.25rem' },
            }}
        >
            {icon}
            {children}
        </Typography>
    );
}
