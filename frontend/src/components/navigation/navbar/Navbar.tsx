'use client';

import { useEvents } from '@/api/cache/Cache';
import { useAuth } from '@/auth/Auth';
import { Event, EventStatus } from '@/database/event';
import {
    AppBar,
    Container,
    Slide,
    Theme,
    Toolbar,
    useMediaQuery,
    useScrollTrigger,
} from '@mui/material';
import NavbarMenu from './NavbarMenu';

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

const Navbar = () => {
    const auth = useAuth();

    const filterTime = new Date(new Date().getTime()).toISOString();
    const { events } = useEvents();

    const meetingCount = events.filter((e: Event) => {
        if (!e.participants || Object.values(e.participants).length === 0) {
            return false;
        }
        if (e.owner !== auth.user?.username && !e.participants[auth.user?.username || '']) {
            return false;
        }
        return e.status !== EventStatus.Canceled && e.endTime >= filterTime;
    }).length;

    return (
        <HideOnScroll>
            <AppBar
                data-testid='navbar'
                position='sticky'
                sx={{ zIndex: 1300, height: 'var(--navbar-height)' }}
            >
                <Container maxWidth={false} sx={{ height: 1 }}>
                    <Toolbar disableGutters sx={{ height: 1 }}>
                        <NavbarMenu meetingCount={meetingCount} />
                    </Toolbar>
                </Container>
            </AppBar>
        </HideOnScroll>
    );
};

export default Navbar;
