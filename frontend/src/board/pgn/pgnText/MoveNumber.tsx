import { Divider, Grid, Stack, Typography } from '@mui/material';
import { scalePgnRem } from '../boardTools/underboard/settings/viewerSettingsConstants';

interface MoveNumberProps {
    ply: number;
}

const MoveNumber: React.FC<MoveNumberProps> = ({ ply }) => {
    let moveNumber = Math.floor(ply / 2);
    if (ply % 2) {
        moveNumber += 1;
    }

    return (
        <Grid key={`move-number-${ply}`} size={2}>
            <Stack
                sx={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: 1,
                    position: 'relative',
                }}
            >
                <Typography
                    sx={{
                        color: 'text.secondary',
                        fontSize: scalePgnRem(1),
                    }}
                >
                    {moveNumber}
                </Typography>
                <Divider orientation='vertical' sx={{ position: 'absolute', right: 0 }} />
            </Stack>
        </Grid>
    );
};

export default MoveNumber;
