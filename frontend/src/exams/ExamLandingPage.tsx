import { Link } from '@/components/navigation/Link';
import { KingIcon, QueenIcon, RookIcon } from '@/style/ChessIcons';
import {
    Card,
    CardActionArea,
    CardContent,
    Container,
    Grid,
    Stack,
    SvgIconProps,
    SvgIconTypeMap,
    Typography,
} from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';

import type { JSX } from 'react';

/**
 * Renders a simple landing page that directs users to the different types of exams
 * (tactics, polgar, endgame, etc).
 */
export const ExamLandingPage = () => {
    return (
        <Container maxWidth='lg' sx={{ py: 5 }}>
            <Grid container rowSpacing={2} columnSpacing={2}>
                <ExamCard
                    name='Tactics Tests'
                    description='All Ratings'
                    href='/tests/tactics'
                    icon={QueenIcon}
                />

                <ExamCard
                    name='Checkmate Tests'
                    description='All Ratings'
                    href='/tests/checkmate'
                    icon={KingIcon}
                />

                <ExamCard
                    name='Endgame Tests'
                    description='All Ratings'
                    href='/tests/endgame'
                    icon={RookIcon}
                />
            </Grid>
        </Container>
    );
};

interface ExamCardProps {
    name: string;
    description: string;
    href: string;
    icon:
        | ((props: SvgIconProps) => JSX.Element)
        | (OverridableComponent<SvgIconTypeMap> & { muiName: string });
    disabled?: boolean;
}

const ExamCard = ({ name, description, href, icon, disabled }: ExamCardProps) => {
    const Icon = icon;
    return (
        <Grid
            size={{
                xs: 12,
                sm: 6,
                md: 4,
            }}
        >
            <Card
                variant={disabled ? 'outlined' : 'elevation'}
                sx={{ opacity: disabled ? 0.8 : 1, height: 1 }}
            >
                <CardActionArea component={Link} disabled={disabled} href={href} sx={{ height: 1 }}>
                    <CardContent>
                        <Stack
                            sx={{
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Icon sx={{ fontSize: '5rem', mb: 2 }} color='primary' />
                            <Typography
                                variant='h5'
                                sx={{
                                    mb: 0.5,
                                }}
                            >
                                {name}
                            </Typography>
                            <Typography
                                variant='subtitle1'
                                sx={{
                                    color: 'text.secondary',
                                    lineHeight: '1.3',
                                }}
                            >
                                {description}
                            </Typography>
                        </Stack>
                    </CardContent>
                </CardActionArea>
            </Card>
        </Grid>
    );
};
