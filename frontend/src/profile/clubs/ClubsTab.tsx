import { useClubs } from '@/api/cache/clubs';
import { RequestSnackbar } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { ListClubItem } from '@/components/clubs/ClubGrid';
import { Link } from '@/components/navigation/Link';
import { User } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

interface ClubsTabProps {
    /** The user whose joined clubs will be displayed. */
    user: User;
}

/**
 * Displays a list of clubs the specified user is a member of.
 * @param user The user whose clubs will be listed.
 * @returns A ReactNode displaying the list of clubs the user is in.
 */
const ClubsTab: React.FC<ClubsTabProps> = ({ user }) => {
    const t = useTranslations('profile.clubsTab');
    const viewer = useAuth().user;
    const { clubs, request } = useClubs(user.clubs || []);

    if (request.isLoading()) {
        return <LoadingPage />;
    }

    const isCurrentUser = viewer?.username === user.username;
    const displayedClubs = isCurrentUser ? clubs : clubs.filter((c) => !c.unlisted);

    if (displayedClubs.length === 0) {
        return (
            <Stack
                sx={{
                    alignItems: 'center',
                }}
            >
                <RequestSnackbar request={request} />

                {isCurrentUser ? (
                    <>
                        <Typography>{t('emptyOwnLine1')}</Typography>
                        <Typography>
                            {t.rich('emptyOwnLine2', {
                                link: (chunks: ReactNode) => <Link href='/clubs'>{chunks}</Link>,
                            })}
                        </Typography>
                    </>
                ) : (
                    <Typography
                        sx={{
                            textAlign: 'center',
                        }}
                    >
                        {t('emptyOther')}
                    </Typography>
                )}
            </Stack>
        );
    }

    return (
        <Stack spacing={2}>
            <RequestSnackbar request={request} />

            {displayedClubs.map((club) => (
                <ListClubItem
                    key={club.id}
                    club={club}
                    isMainClub={isCurrentUser && club.id === viewer?.mainClubId}
                />
            ))}
        </Stack>
    );
};

export default ClubsTab;
