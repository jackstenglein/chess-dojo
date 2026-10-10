import { useLightMode } from '@/style/useLightMode';
import { KeyboardDoubleArrowRight, MenuOpen } from '@mui/icons-material';
import { Box, Card, Drawer, IconButton, Stack, Theme, useMediaQuery } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';

export interface StudyLayoutProps {
    /** Renders the catalog, with a collapse callback only where the catalog can collapse. */
    catalog: (onCollapse?: () => void) => ReactNode;
    catalogOpen: boolean;
    onToggleCatalog: () => void;
    /** The board area. */
    children: ReactNode;
}

const CATALOG_WIDTH = 300;
const COLLAPSED_WIDTH = 36;

/**
 * The catalog beside the board area at the medium breakpoint and up, or a drawer below it.
 * The board sizes itself to the window. The catalog stretches to the same row height.
 */
export function StudyLayout({ catalog, catalogOpen, onToggleCatalog, children }: StudyLayoutProps) {
    const t = useTranslations('study.catalog');
    const wide = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
    const light = useLightMode();
    const [drawerOpen, setDrawerOpen] = useState(false);

    // The board refits to its parent only on a window resize event, so dispatch one on toggle.
    useEffect(() => {
        window.dispatchEvent(new Event('resize'));
    }, [catalogOpen]);

    if (!wide) {
        return (
            <Box sx={{ px: 1, py: 2 }}>
                <Stack direction='row' sx={{ mb: 1 }}>
                    <IconButton onClick={() => setDrawerOpen(true)} aria-label='catalog'>
                        <MenuOpen />
                    </IconButton>
                </Stack>
                <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                    <Stack
                        sx={{ width: CATALOG_WIDTH, height: 1 }}
                        onClick={() => setDrawerOpen(false)}
                    >
                        {catalog()}
                    </Stack>
                </Drawer>
                {children}
            </Box>
        );
    }

    return (
        <Stack direction='row' sx={{ p: 2, gap: 2, alignItems: 'stretch' }}>
            {catalogOpen ? (
                // The card is absolutely positioned inside a stretched column. As a flex item, a
                // long catalog would grow the row past the board instead of scrolling.
                <Box sx={{ width: CATALOG_WIDTH, flexShrink: 0, position: 'relative' }}>
                    <Card
                        elevation={light ? undefined : 3}
                        variant={light ? 'outlined' : 'elevation'}
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: 'none',
                        }}
                    >
                        {catalog(onToggleCatalog)}
                    </Card>
                </Box>
            ) : (
                <Box sx={{ width: COLLAPSED_WIDTH, flexShrink: 0 }}>
                    <IconButton
                        onClick={onToggleCatalog}
                        aria-label={t('expand')}
                        data-testid='study-catalog-expand'
                        size='small'
                    >
                        <KeyboardDoubleArrowRight />
                    </IconButton>
                </Box>
            )}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
        </Stack>
    );
}
