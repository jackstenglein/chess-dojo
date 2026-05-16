'use client';

import { MUI_LICENSE_KEY } from '@/config';
import { LocalizationProvider as MuiLocalizationProvider } from '@mui/x-date-pickers-pro';
import { AdapterLuxon } from '@mui/x-date-pickers-pro/AdapterLuxon';
import { LicenseInfo } from '@mui/x-license';
import { useLocale } from 'next-intl';
import { ReactNode } from 'react';

LicenseInfo.setLicenseKey(MUI_LICENSE_KEY);

export const LocalizationProvider = ({ children }: { children: ReactNode }) => {
    const locale = useLocale();
    // Pseudo is not a BCP 47 tag; Luxon would silently fall back. Map it explicitly
    // so the intent (English formatting on nonprod pseudo) is visible at the boundary.
    const adapterLocale = locale === 'pseudo' ? 'en' : locale;

    return (
        <MuiLocalizationProvider dateAdapter={AdapterLuxon} adapterLocale={adapterLocale}>
            {children}
        </MuiLocalizationProvider>
    );
};
