import CloseIcon from '@mui/icons-material/Close';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Badge } from './badgeHandler';

interface BadgeDialogProps {
    selectedBadge?: Badge;
    handleCloseDialog: () => void;
}

export function BadgeDialog({ selectedBadge, handleCloseDialog }: BadgeDialogProps) {
    const tInfo = useTranslations('profile.info');
    return (
        <Dialog open={selectedBadge !== undefined} onClose={handleCloseDialog} fullWidth>
            {selectedBadge && (
                <>
                    <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {selectedBadge.title}
                        <IconButton
                            aria-label={tInfo('close')}
                            onClick={handleCloseDialog}
                            sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent
                        sx={{
                            textAlign: 'center',
                            overflow: 'visible',
                            '@keyframes glow-animation': selectedBadge.glowHexcode
                                ? {
                                      '0%': {
                                          filter: `drop-shadow(0 0 8px ${selectedBadge.glowHexcode})`,
                                      },
                                      '100%': {
                                          filter: `drop-shadow(0 0 16px ${selectedBadge.glowHexcode})`,
                                      },
                                  }
                                : undefined,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                position: 'relative',
                                width: '90%',
                                aspectRatio: 1,
                                margin: 'auto',
                            }}
                        >
                            <Image
                                src={selectedBadge.image}
                                alt={selectedBadge.title}
                                fill
                                style={{
                                    borderRadius: '10px',
                                    animation: selectedBadge.glowHexcode
                                        ? 'glow-animation 1.5s infinite alternate'
                                        : undefined,
                                    filter: selectedBadge.glowHexcode
                                        ? `drop-shadow(0 0 12px ${selectedBadge.glowHexcode})`
                                        : undefined,
                                }}
                            />
                        </Box>
                        <Typography variant='body1' sx={{ mt: 1 }}>
                            {selectedBadge.message}
                        </Typography>
                    </DialogContent>
                </>
            )}
        </Dialog>
    );
}

export default BadgeDialog;
