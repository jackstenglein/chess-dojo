import { ApiProvider } from '@/api/Api';
import { CacheProvider } from '@/api/cache/Cache';
import { AuthProvider } from '@/auth/Auth';
import { RequireProfile } from '@/components/auth/RequireProfile';
import { LocalizationProvider } from '@/components/mui/LocalizationProvider';
import Navbar from '@/components/navigation/navbar/Navbar';
import { TimerContextProvider } from '@/components/timer/TimerContext';
import ThemeProvider from '@/style/ThemeProvider';
import { TranslationProvider } from '@/translation/TranslationProvider';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <AppRouterCacheProvider>
            <ThemeProvider>
                <AuthProvider>
                    <ApiProvider>
                        <RequireProfile />

                        <CacheProvider>
                            <TranslationProvider>
                                <LocalizationProvider>
                                    <TimerContextProvider>
                                        <Navbar />
                                        {children}
                                    </TimerContextProvider>
                                </LocalizationProvider>
                            </TranslationProvider>
                        </CacheProvider>
                    </ApiProvider>
                </AuthProvider>
            </ThemeProvider>
        </AppRouterCacheProvider>
    );
}
