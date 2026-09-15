import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import NightlightIcon from '@mui/icons-material/Nightlight';
import { FormControlLabel, ListItemIcon, MenuItem, Switch, useColorScheme } from '@mui/material';
import { useTranslations } from 'next-intl';

const DarkModeToggle = () => {
    const auth = useAuth();
    const user = auth.user;
    const { mode, setMode } = useColorScheme();
    const api = useApi();
    const t = useTranslations('navbar');

    if (!user) {
        return null;
    }

    const toggleColorMode = () => {
        setMode(mode === 'light' ? 'dark' : 'light');
        void api.updateUser({ enableLightMode: mode === 'dark' });
    };

    return (
        <>
            <MenuItem>
                <ListItemIcon>
                    <NightlightIcon />
                </ListItemIcon>

                <FormControlLabel
                    value='start'
                    control={
                        <Switch
                            color='primary'
                            checked={mode === 'dark'}
                            onChange={toggleColorMode}
                        />
                    }
                    label={t('darkMode')}
                    labelPlacement='start'
                    sx={{ ml: 0 }}
                />
            </MenuItem>
        </>
    );
};

export default DarkModeToggle;
