import { EventType, trackEvent } from '@/analytics/events';
import GraduationCard from '@/components/graduations/GraduationCard';
import { Graduation } from '@/database/graduation';
import LoadingPage from '@/loading/LoadingPage';
import { logger } from '@/logging/logger';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
} from '@mui/material';
import { domToPng } from 'modern-screenshot';
import { useEffect, useState } from 'react';

interface GraduationShareDialogProps {
    open: boolean;
    onClose: () => void;
    graduation: Graduation;
}

export default function GraduationShareDialog({
    open,
    onClose,
    graduation,
}: GraduationShareDialogProps) {
    const { newCohort } = graduation;
    const [reportRef, setReportRef] = useState<HTMLDivElement>();
    const [imageData, setImageData] = useState<string>();

    useEffect(() => {
        if (!reportRef) {
            return;
        }

        // There are potentials CORS issues with AWS S3 that causes images within
        // not to load in Firefox and ios. Then when CORS settings change (e.g. you fix it),
        // the cache may cause Chrome to break loading that same image.
        domToPng(reportRef, {
            debug: true,
            fetch: {
                bypassingCache: true,
            },
            quality: 1,
            scale: 2,
            backgroundColor: '#121212',
        })
            .then((dataUrl) => {
                setImageData(dataUrl);
            })
            .catch((error: unknown) => {
                logger.error?.('domToPng: ', error);
            });
    }, [reportRef, setImageData]);

    if (!open) {
        return null;
    }

    const onDownload = () => {
        if (!imageData) {
            return;
        }

        trackEvent(EventType.DownloadGradBox, {
            previous_cohort: graduation.previousCohort,
            new_cohort: graduation.newCohort,
            dojo_score: graduation.score,
            graduated_at: graduation.createdAt,
        });

        const link = document.createElement('a');
        link.href = imageData;
        link.download = `graduation-${newCohort}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClose = () => {
        setImageData(undefined);
        onClose();
    };

    return (
        <Dialog maxWidth='md' open={open} onClose={handleClose} fullWidth>
            <DialogTitle>Share your progress!</DialogTitle>
            <DialogContent>
                <Stack spacing={2}>
                    <DialogContentText>
                        Show off your hard work and welcome the world to the Dojo! Download this
                        image and share on social media.
                    </DialogContentText>
                    <Stack
                        display='grid'
                        gridTemplateRows='auto 1fr'
                        alignItems='center'
                        justifyContent='center'
                    >
                        {imageData ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                style={{
                                    height: 'auto',
                                    maxWidth: '100%',
                                    borderRadius: '8px',
                                }}
                                alt='dojo graduation badge'
                                src={imageData}
                            />
                        ) : (
                            <ReportCanvas reportRef={setReportRef}>
                                <GraduationCard graduation={graduation} />
                            </ReportCanvas>
                        )}
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
                <Button loading={!imageData} onClick={onDownload}>
                    Download
                </Button>
            </DialogActions>
        </Dialog>
    );
}

interface ReportCanvasProps {
    width?: number | string;
    height?: number | string;
    reportRef: React.Dispatch<React.SetStateAction<HTMLDivElement | undefined>>;
    children: React.ReactElement;
}

const ReportCanvas = ({ reportRef, children }: ReportCanvasProps) => {
    return (
        <Box
            position='relative'
            overflow='hidden'
            sx={{ aspectRatio: '1.6/1', borderRadius: 1 }}
            width='100%'
            height='auto'
        >
            <Box
                display='grid'
                height='100%'
                width='100%'
                bgcolor='background.default'
                position='absolute'
                zIndex={1}
            >
                <LoadingPage />
            </Box>
            <Box
                ref={reportRef}
                display='grid'
                sx={{
                    width: '800px',
                    height: '540px',
                }}
            >
                {children}
            </Box>
        </Box>
    );
};
