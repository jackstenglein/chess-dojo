import CloseIcon from '@mui/icons-material/Close';
import {
    Box,
    Card,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    LinearProgress,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Badge, BadgeCategory } from './badgeHandler';
import { BadgeImage } from './BadgeImage';
import { BadgeProgress } from './BadgeProgress';

interface BadgeCabinetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    allBadges: Badge[];
}

export function BadgCabinetDialog({ isOpen, onClose, allBadges }: BadgeCabinetDialogProps) {
    const tBadge = useTranslations('profile.info.badge');
    const tInfo = useTranslations('profile.info');
    const [badgeCategory, setBadgeCategory] = useState(BadgeCategory.All);

    const categoryLabels: Record<BadgeCategory, string> = {
        [BadgeCategory.All]: tBadge('categoryAll'),
        [BadgeCategory.Achieved]: tBadge('categoryAchieved'),
        [BadgeCategory.Polgar]: tBadge('categoryPolgar'),
        [BadgeCategory.Games]: tBadge('categoryGames'),
        [BadgeCategory.Annotation]: tBadge('categoryAnnotation'),
        [BadgeCategory.Graduation]: tBadge('categoryGraduation'),
    };

    let displayedBadges = allBadges;
    if (badgeCategory === BadgeCategory.Achieved) {
        displayedBadges = allBadges.filter((b) => b.isEarned);
    } else if (badgeCategory !== BadgeCategory.All) {
        displayedBadges = allBadges.filter((b) => b.category === badgeCategory);
    }

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth='md' fullWidth>
            <DialogTitle
                sx={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                {tBadge('allBadges')}
                <IconButton
                    aria-label={tInfo('close')}
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pb: 3 }}>
                <FormControl sx={{ mb: 2 }}>
                    <Select
                        value={badgeCategory}
                        onChange={(e) => setBadgeCategory(e.target.value)}
                    >
                        {Object.entries(BadgeCategory).map(([key, value]) => (
                            <MenuItem key={key} value={value}>
                                {categoryLabels[value]}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <BadgeProgress
                    total={
                        badgeCategory === BadgeCategory.Achieved
                            ? allBadges.length
                            : displayedBadges.length
                    }
                    earned={displayedBadges.filter((b) => b.isEarned).length}
                />

                <Stack spacing={1}>
                    {displayedBadges.map((badge, idx) => (
                        <Card
                            key={idx}
                            sx={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                padding: 2,
                                boxShadow: 3,
                            }}
                        >
                            <Box
                                sx={{
                                    height: '80px',
                                    width: '80px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: badge.isEarned
                                        ? 'rgba(255, 223, 186, 0.8)'
                                        : 'rgba(255,255,255,0.1)',
                                    borderRadius: '50%',
                                    border: '3px solid',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                    filter: badge.isEarned ? 'none' : 'grayscale(60%) opacity(0.6)',
                                    marginRight: 2,
                                }}
                            >
                                <BadgeImage badge={badge} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography
                                    variant='h6'
                                    sx={{
                                        fontWeight: 'bold',
                                        color: badge.isEarned ? 'text' : 'text.secondary',
                                    }}
                                >
                                    {badge.title}
                                </Typography>
                                {badge.isEarned ? (
                                    <Typography variant='body2'>{badge.message}</Typography>
                                ) : (
                                    badge.currentCount !== undefined &&
                                    badge.level && (
                                        <Stack
                                            direction='row'
                                            sx={{
                                                width: 1,
                                                gap: 1,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <LinearProgress
                                                variant='determinate'
                                                color='success'
                                                value={(100 * badge.currentCount) / badge.level}
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 5,
                                                    flexGrow: 1,
                                                    filter: 'grayscale(20%) opacity(0.6)',
                                                }}
                                            />
                                            <Typography
                                                variant='body2'
                                                sx={{
                                                    color: 'text.secondary',
                                                }}
                                            >
                                                {badge.currentCount} / {badge.level}
                                            </Typography>
                                        </Stack>
                                    )
                                )}
                            </Box>
                        </Card>
                    ))}
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
