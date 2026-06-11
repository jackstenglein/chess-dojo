import { ExamCard } from '@/components/exams/ExamCard';
import { KingIcon, QueenIcon, RookIcon } from '@/style/ChessIcons';
import { EmojiEvents, Visibility } from '@mui/icons-material';
import { Container, Grid } from '@mui/material';

/**
 * Renders a simple landing page that directs users to the different types of exams
 * (tactics, polgar, endgame, etc).
 */
export default function ExamLandingPage() {
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
                    name='Checkmate Puzzles'
                    description='All Ratings'
                    href='/puzzles/checkmate'
                    icon={KingIcon}
                />

                <ExamCard
                    name='Endgame Tests'
                    description='All Ratings'
                    href='/tests/endgame'
                    icon={RookIcon}
                />

                <ExamCard
                    name='Square Color Drill'
                    description='All Ratings'
                    href='/puzzles/square-colors'
                    icon={Visibility}
                />

                <ExamCard
                    name='Mate in One Visualization Drill'
                    description='All Ratings'
                    href='/puzzles/mate-in-one'
                    icon={EmojiEvents}
                />
            </Grid>
        </Container>
    );
}
