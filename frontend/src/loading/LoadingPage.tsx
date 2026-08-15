import { CircularProgress, Stack, SxProps } from '@mui/material';

const LoadingPage = ({ disableShrink, sx }: { disableShrink?: boolean; sx?: SxProps }) => {
    return (
        <Stack
            sx={{
                justifyContent: 'center',
                alignItems: 'center',
                pt: 6,
                pb: 4,
                ...sx,
            }}
        >
            <CircularProgress disableShrink={disableShrink} />
        </Stack>
    );
};

export default LoadingPage;
