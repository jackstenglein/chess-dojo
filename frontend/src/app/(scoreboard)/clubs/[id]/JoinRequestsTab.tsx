import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { GetClubResponse } from '@/api/clubApi';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import { ClubDetails, ClubJoinRequest, ClubJoinRequestStatus } from '@/database/club';
import Avatar from '@/profile/Avatar';
import { Block, Check } from '@mui/icons-material';
import { CircularProgress, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface JoinRequestsTabProps {
    club: ClubDetails;
    onProcessRequest: (club: GetClubResponse, snackbarText: string) => void;
}

export const JoinRequestsTab: React.FC<JoinRequestsTabProps> = ({ club, onProcessRequest }) => {
    const t = useTranslations('clubs.joinRequestsTab');
    const viewer = useAuth().user;
    if (viewer?.username !== club.owner) {
        return null;
    }

    const pendingRequests = Object.values(club.joinRequests)
        .filter((joinRequest) => joinRequest.status !== ClubJoinRequestStatus.Rejected)
        .sort((lhs, rhs) => rhs.createdAt.localeCompare(lhs.createdAt));

    const rejectedRequests = Object.values(club.joinRequests)
        .filter((joinRequest) => joinRequest.status === ClubJoinRequestStatus.Rejected)
        .sort((lhs, rhs) => rhs.createdAt.localeCompare(lhs.createdAt));

    return (
        <Stack spacing={7}>
            <Stack spacing={3}>
                <Typography variant='h5'>{t('pendingTitle')}</Typography>
                {pendingRequests.map((joinRequest, idx) => (
                    <JoinRequest
                        key={joinRequest.username}
                        clubId={club.id}
                        joinRequest={joinRequest}
                        divider={idx + 1 < pendingRequests.length}
                        onProcessRequest={onProcessRequest}
                    />
                ))}
                {pendingRequests.length === 0 && <Typography>{t('noPending')}</Typography>}
            </Stack>

            <Stack spacing={3}>
                <Typography variant='h5'>{t('rejectedTitle')}</Typography>
                {rejectedRequests.map((joinRequest, idx) => (
                    <JoinRequest
                        key={joinRequest.username}
                        clubId={club.id}
                        joinRequest={joinRequest}
                        divider={idx + 1 < rejectedRequests.length}
                        onProcessRequest={onProcessRequest}
                    />
                ))}
                {rejectedRequests.length === 0 && <Typography>{t('noRejected')}</Typography>}
            </Stack>
        </Stack>
    );
};

interface JoinRequestProps {
    clubId: string;
    joinRequest: ClubJoinRequest;
    divider: boolean;
    onProcessRequest: (club: GetClubResponse, snackbarText: string) => void;
}

const JoinRequest: React.FC<JoinRequestProps> = ({
    clubId,
    joinRequest,
    divider,
    onProcessRequest,
}) => {
    const t = useTranslations('clubs.joinRequestsTab');
    const viewer = useAuth().user;
    const api = useApi();
    const request = useRequest();

    const date = new Date(joinRequest.createdAt);
    const dateStr = toDojoDateString(date, viewer?.timezoneOverride);
    const timeStr = toDojoTimeString(date, viewer?.timezoneOverride, viewer?.timeFormat);

    const handleRequest = (status: ClubJoinRequestStatus) => {
        request.onStart();
        api.processJoinRequest(clubId, joinRequest.username, status)
            .then((resp) => {
                if (status === ClubJoinRequestStatus.Approved) {
                    onProcessRequest(
                        resp.data,
                        t('approvedSnackbar', { displayName: joinRequest.displayName }),
                    );
                } else if (status === ClubJoinRequestStatus.Rejected) {
                    onProcessRequest(resp.data, t('rejectedSnackbar'));
                }
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Stack spacing={2}>
            <RequestSnackbar request={request} />

            <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                flexWrap='wrap'
                rowGap={2}
            >
                <Stack direction='row' spacing={2} alignItems='center'>
                    <Avatar
                        username={joinRequest.username}
                        displayName={joinRequest.displayName}
                        size={68}
                    />

                    <Stack>
                        <Link href={`/profile/${joinRequest.username}`}>
                            {joinRequest.displayName}
                        </Link>
                        <Typography color='text.secondary'>{joinRequest.cohort}</Typography>
                        <Typography color='text.secondary' variant='body2'>
                            {dateStr} • {timeStr}
                        </Typography>
                    </Stack>
                </Stack>

                <Stack direction='row' spacing={1} alignItems='center'>
                    {request.isLoading() ? (
                        <CircularProgress />
                    ) : (
                        <>
                            <Tooltip title={t('approveTooltip')}>
                                <IconButton>
                                    <Check
                                        color='success'
                                        onClick={() =>
                                            handleRequest(ClubJoinRequestStatus.Approved)
                                        }
                                    />
                                </IconButton>
                            </Tooltip>

                            {joinRequest.status !== ClubJoinRequestStatus.Rejected && (
                                <Tooltip title={t('rejectTooltip')}>
                                    <IconButton>
                                        <Block
                                            color='error'
                                            onClick={() =>
                                                handleRequest(ClubJoinRequestStatus.Rejected)
                                            }
                                        />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </>
                    )}
                </Stack>
            </Stack>

            <Typography whiteSpace='pre-line'>{joinRequest.notes}</Typography>

            {divider && <Divider />}
        </Stack>
    );
};
