import { useAuth } from '@/auth/Auth';
import Avatar from '@/profile/Avatar';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Person2Icon from '@mui/icons-material/Person2';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsIcon from '@mui/icons-material/Sports';
import { Button, ListItemIcon, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import DarkModeToggle from './DarkModeToggle';

const ProfileButton = () => {
    const auth = useAuth();
    const user = auth.user;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    if (!user) {
        return null;
    }

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleClick = (func: () => void) => {
        return () => {
            func();
            handleClose();
        };
    };

    return (
        <>
            <Button data-testid='navbar-profile-button' onClick={handleOpen}>
                <Stack direction='row' alignItems='center'>
                    <Avatar user={user} size={40} />
                    <ExpandMoreIcon sx={{ color: 'white' }} />
                </Stack>
            </Button>
            <Menu
                id='profile-menu'
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem component='a' href='/profile?view=stats'>
                    <ListItemIcon>
                        <Person2Icon />
                    </ListItemIcon>
                    <Typography textAlign='center'>Profile</Typography>
                </MenuItem>

                <MenuItem component='a' href='/profile/edit'>
                    <ListItemIcon>
                        <SettingsIcon />
                    </ListItemIcon>
                    <Typography textAlign='center'>Settings</Typography>
                </MenuItem>

                {user.isCoach && (
                    <MenuItem component='a' href='/coach'>
                        <ListItemIcon>
                            <SportsIcon />
                        </ListItemIcon>
                        <Typography textAlign='center'>Coach Portal</Typography>
                    </MenuItem>
                )}

                <DarkModeToggle />

                <MenuItem onClick={handleClick(auth.signout)}>
                    <ListItemIcon>
                        <ExitToAppIcon color='error' />
                    </ListItemIcon>
                    <Typography textAlign='center' color='error'>
                        Sign Out
                    </Typography>
                </MenuItem>
            </Menu>
        </>
    );
};

export default ProfileButton;
