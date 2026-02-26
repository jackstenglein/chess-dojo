'use client';

import {
    AppBar,
    Container,
    Slide,
    Theme,
    Toolbar,
    useMediaQuery,
    useScrollTrigger,
} from '@mui/material';
import UnauthenticatedMenu from './UnauthenticatedMenu';

interface HideOnScrollProps {
    children: React.ReactElement;
}

function HideOnScroll(props: HideOnScrollProps) {
    const isMedium = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
    const trigger = useScrollTrigger({ threshold: 20 });

    return (
        <Slide appear={false} direction='down' in={!trigger || isMedium}>
            {props.children}
        </Slide>
    );
}

export const UnauthenticatedNavbar = () => {
    return (
        <HideOnScroll>
            <AppBar
                data-testid='navbar'
                position='sticky'
                sx={{ zIndex: 1300, height: 'var(--navbar-height)' }}
            >
                <Container maxWidth={false} sx={{ height: 1 }}>
                    <Toolbar disableGutters sx={{ height: 1 }}>
                        <UnauthenticatedMenu />
                    </Toolbar>
                </Container>
            </AppBar>
        </HideOnScroll>
    );
};
