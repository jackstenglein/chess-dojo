import { Box } from '@mui/material';
import { Suspense } from 'react';
import AnalysisBoard from './AnalysisBoard';

export default function Page() {
    return (
        <Box
            sx={{
                pt: 4,
                pb: 4,
                px: 0,
            }}
        >
            <Suspense>
                <AnalysisBoard />
            </Suspense>
        </Box>
    );
}
