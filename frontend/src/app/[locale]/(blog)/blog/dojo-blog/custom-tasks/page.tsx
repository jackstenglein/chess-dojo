import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import createcustomtasks from './create-custom-tasks.png';
import customtask from './custom-tasks.png';
import heatmap from './heatmap.png';

export const metadata: Metadata = {
    title: 'Custom Tasks Are Here! | ChessDojo Blog',
    description: `Huge update for the Dojo! It is now possible to add custom tasks to the Training Program!`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Games', 'Repertoire'],
};

export default function CustomTasks() {
    return (
        <Container>
            <Header title='Custom Tasks Are Here!' subtitle='Dojo Blog • February 14, 2025' />

            <Stack
                sx={{
                    mt: 3,
                }}
            >
                <Typography
                    sx={{
                        mt: 2,
                    }}
                >
                    Huge update for the Dojo! It is now possible to add custom tasks to the Training
                    Program!
                </Typography>

                <Typography
                    sx={{
                        mt: 2,
                    }}
                >
                    This means students can now add any books, exercises, or tasks of their choice
                    to the relevant category (Games & Analysis, Tactics, Openings, Middlegames,
                    Endgames) and track their progress accordingly!
                </Typography>

                <Typography
                    sx={{
                        mt: 4,
                    }}
                >
                    Additionally, you can now give your custom tasks goals, so that they track your
                    progress just like regular tasks in the program, rather than just tracking time.
                </Typography>

                <Typography
                    sx={{
                        mt: 2,
                    }}
                >
                    At the bottom of each category, there will be a button to add custom tasks. You
                    can also move your existing custom tasks from Non-Dojo to other categories, and
                    your heatmap and timeline will be updated to match. There is no need to manually
                    copy data between two custom tasks.
                </Typography>

                <Stack
                    sx={{
                        mt: 2,
                        alignItems: 'center',
                    }}
                >
                    <Image
                        src={customtask}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Stack
                    sx={{
                        mt: 2,
                        alignItems: 'center',
                    }}
                >
                    <Image
                        src={createcustomtasks}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography
                    sx={{
                        mt: 4,
                    }}
                >
                    Any time logged on a custom task will also be tracked in one’s personal heatmap
                    & activity breakdown. Tasks can be broken down by chapters, games, exercises,
                    pages, time spent, or any other unit of choice.
                </Typography>
                <Stack
                    sx={{
                        mt: 2,
                        alignItems: 'center',
                    }}
                >
                    <Image
                        src={heatmap}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography
                    sx={{
                        mt: 4,
                    }}
                >
                    While senseis Jesse, David, and Kostya still urge users to trust the program,
                    there may be other books or tasks that a user would like to track, and we
                    respect that! (As long as it’s sweat work) 😉
                </Typography>

                <Typography
                    sx={{
                        mt: 4,
                    }}
                >
                    Next up, we are working voraciously towards an algorithm that will let users
                    break their plans up into weekly tasks. Stay tuned!
                </Typography>

                <Footer utmCampaign='digest17' />
            </Stack>
        </Container>
    );
}
