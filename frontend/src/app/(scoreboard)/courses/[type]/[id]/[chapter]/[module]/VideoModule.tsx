import { Box, Stack } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ModuleProps } from './Module';

const VideoModule: React.FC<ModuleProps> = ({ module }) => {
    const t = useTranslations('courses.video');
    if (!module.videoUrls || module.videoUrls.length === 0) {
        return null;
    }

    return (
        <Stack spacing={2}>
            {module.videoUrls.map((url, idx) => (
                <Stack key={idx}>
                    <Box
                        sx={{
                            width: {
                                xs: 1,
                                sm: 0.7,
                                lg: 0.6,
                            },
                            mt: 1,
                            aspectRatio: '1.77',
                        }}
                    >
                        <iframe
                            src={url}
                            title={t('videoTitle', { index: idx + 1 })}
                            allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                            allowFullScreen={true}
                            style={{ width: '100%', height: '100%' }}
                            frameBorder={0}
                        />
                    </Box>
                </Stack>
            ))}
        </Stack>
    );
};

export default VideoModule;
