import { Box, Container as MuiContainer } from '@mui/material';
import { ReactNode } from 'react';

export const Container = ({ children }: { children: ReactNode }) => {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                py: { xs: 2, sm: 5 },
                px: { xs: 1, sm: 3 },
                background:
                    'radial-gradient(ellipse at 50% 0%, rgba(244, 147, 30, 0.09), transparent 65%)',
            }}
        >
            <MuiContainer
                component='article'
                maxWidth='md'
                sx={{
                    py: { xs: 3, sm: 6 },
                    px: { xs: 2.5, sm: 6, md: 8 },
                    maxWidth: '920px !important',
                    bgcolor: 'background.paper',
                    // The dark theme uses nearly identical default and paper backgrounds.
                    // Blend in a little foreground color so the reading surface stays visible.
                    backgroundColor:
                        'color-mix(in srgb, var(--mui-palette-background-paper) 94%, var(--mui-palette-text-primary) 6%)',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderTop: '3px solid',
                    borderTopColor: 'dojoOrange.main',
                    borderRadius: { xs: 2, sm: 4 },
                    boxShadow: '0 16px 60px rgba(0, 0, 0, 0.12)',
                    '& p:not([data-testid="blog-header"] *)': {
                        fontSize: { xs: '1rem', sm: '1.125rem' },
                        lineHeight: 1.85,
                    },
                    '& a:not([data-testid="blog-header"] *)': {
                        textUnderlineOffset: '4px',
                        textDecorationThickness: '1px',
                    },
                    '& iframe': { borderRadius: 2, border: 0, my: 2 },
                    '& img': { maxWidth: '100%' },
                    // Legacy articles use MUI headings instead of the Markdown renderer.
                    // Keep the title/subtitle in Header independent of article sections.
                    '& :is(h2, h3, h4, h5, h6):not([data-testid="blog-header"] *)': {
                        color: 'text.primary',
                        fontWeight: 800,
                        lineHeight: 1.25,
                        letterSpacing: '-0.02em',
                        mt: 5,
                        mb: 2,
                        '& strong, & em, & a': { fontSize: 'inherit', fontWeight: 'inherit' },
                    },
                    '& :is(h2, h3):not([data-testid="blog-header"] *)': {
                        fontSize: { xs: '1.75rem', sm: '2rem' },
                        pb: 1.25,
                        borderBottom: '2px solid',
                        borderColor: 'divider',
                    },
                    '& :is(h4, h5, h6):not([data-testid="blog-header"] *)': {
                        fontSize: { xs: '1.4rem', sm: '1.6rem' },
                    },
                }}
            >
                {children}
            </MuiContainer>
        </Box>
    );
};
