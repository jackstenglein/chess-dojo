import { Link } from '@/components/navigation/Link';
import { dojoCohorts } from '@/database/user';
import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Container,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { Metadata } from 'next';
import { useTranslations } from 'next-intl';

export const metadata: Metadata = {
    title: 'ChessDojo Guides',
    description:
        "Chess Dojo's recommendations for playing classical games, sparring against bots, and more",
};

export default function Page() {
    const t = useTranslations('learn.guides');
    return (
        <Container sx={{ py: 3 }}>
            <Stack spacing={5} mb={5}>
                <Typography variant='h4'>{t('pageTitle')}</Typography>
                <Stack>
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>{t('classical.title')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                {t.rich('classical.intro', {
                                    strong: (chunks) => <strong>{chunks}</strong>,
                                })}
                            </Typography>
                            <Typography sx={{ mt: 3 }}>
                                {t('classical.minTimeControlsTitle')}
                            </Typography>
                            <ul>
                                <li>{t('classical.tc1')}</li>
                                <li>{t('classical.tc2')}</li>
                                <li>{t('classical.tc3')}</li>
                                <li>{t('classical.tc4')}</li>
                                <li>{t('classical.tc5')}</li>
                            </ul>
                            <Typography>{t('classical.altTimeControls')}</Typography>{' '}
                            <Typography sx={{ mt: 3 }}>{t('classical.tipsTitle')}</Typography>
                            <ul>
                                <li>{t('classical.tip1')}</li>
                                <li>{t('classical.tip2')}</li>
                                <li>{t('classical.tip3')}</li>
                                <li>{t('classical.tip4')}</li>
                                <li>{t('classical.tip5')}</li>
                            </ul>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>{t('analyzing.title')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>{t('analyzing.intro')}</Typography>
                            <Typography sx={{ mt: 2 }}>
                                {t.rich('analyzing.submitGame', {
                                    link: (chunks) => <Link href='/games/import'>{chunks}</Link>,
                                })}
                            </Typography>
                            <Typography sx={{ mt: 3 }}>{t('analyzing.tipsTitle')}</Typography>
                            <ul>
                                <li>{t('analyzing.tip1')}</li>
                                <li>{t('analyzing.tip2')}</li>
                                <li>{t('analyzing.tip3')}</li>
                                <li>{t('analyzing.tip4')}</li>
                                <li>{t('analyzing.tip5')}</li>
                                <li>{t('analyzing.tip6')}</li>
                                <li>{t('analyzing.tip7')}</li>
                            </ul>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>{t('postmortems.title')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>{t('postmortems.intro')}</Typography>
                            <Typography sx={{ mt: 2 }}>{t('postmortems.paragraph1')}</Typography>
                            <Typography sx={{ mt: 2 }}>{t('postmortems.paragraph2')}</Typography>
                            <Typography sx={{ mt: 3 }}>{t('postmortems.howTitle')}</Typography>
                            <ul>
                                <li>{t('postmortems.how1')}</li>
                                <li>{t('postmortems.how2')}</li>
                            </ul>
                            <Typography sx={{ mt: 3 }}>
                                {t('postmortems.questionsTitle')}
                            </Typography>
                            <ul>
                                <li>{t('postmortems.q1')}</li>
                                <li>{t('postmortems.q2')}</li>
                                <li>{t('postmortems.q3')}</li>
                                <li>{t('postmortems.q4')}</li>
                            </ul>
                            <Typography sx={{ mt: 3 }}>
                                {t('postmortems.etiquetteTitle')}
                            </Typography>
                            <ul>
                                <li>{t('postmortems.e1')}</li>
                                <li>{t('postmortems.e2')}</li>
                                <li>{t('postmortems.e3')}</li>
                            </ul>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>{t('tactics.title')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>{t('tactics.intro')}</Typography>
                            <Typography sx={{ mt: 2 }}>{t('tactics.websitesIntro')}</Typography>
                            <ul>
                                <li>{t('tactics.website1')}</li>
                                <li>{t('tactics.website2')}</li>
                                <li>{t('tactics.website3')}</li>
                                <li>{t('tactics.website4')}</li>
                                <li>{t('tactics.website5')}</li>
                                <li>{t('tactics.website6')}</li>
                                <li>{t('tactics.website7')}</li>
                                <li>{t('tactics.website8')}</li>
                                {t('tactics.ctArtSuffix')}
                                <li>{t('tactics.website9')}</li>
                                <li>{t('tactics.website10')}</li>
                            </ul>

                            <Typography sx={{ mt: 3 }}>{t('tactics.tipsTitle')}</Typography>
                            <ol>
                                <li>{t('tactics.tip1')}</li>
                                <li>{t('tactics.tip2')}</li>
                                <li>{t('tactics.tip3')}</li>
                                <li>{t('tactics.tip4')}</li>
                            </ol>

                            <Typography sx={{ mt: 3 }}>{t('tactics.rushIntro')}</Typography>
                            <ul>
                                <li>{t('tactics.rush1')}</li>
                                <li>{t('tactics.rush2')}</li>
                                <li>{t('tactics.rush3')}</li>
                                <li>{t('tactics.rush4')}</li>
                                <li>{t('tactics.rush5')}</li>
                                <li>{t('tactics.rush6')}</li>
                            </ul>
                            <Typography sx={{ mt: 3 }}>{t('tactics.faqTitle')}</Typography>
                            <ul>
                                <li>{t('tactics.faq1')}</li>
                                <li>{t('tactics.faq2')}</li>
                                <li>{t('tactics.faq3')}</li>
                                <li>{t('tactics.faq4')}</li>
                                <li>{t('tactics.faq5')}</li>
                            </ul>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>{t('visualization.title')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>{t('visualization.intro')}</Typography>
                            <Typography sx={{ mt: 2 }}>{t('visualization.otb')}</Typography>
                            <Typography sx={{ mt: 2 }}>
                                <strong>{t('visualization.needHeading')}</strong>
                            </Typography>
                            <Typography sx={{ mt: 2 }}>{t('visualization.needBody')}</Typography>
                            <Typography sx={{ mt: 2 }}>
                                <strong>{t('visualization.howHeading')}</strong>
                            </Typography>
                            <Typography sx={{ mt: 2 }}>{t('visualization.howBody1')}</Typography>
                            <Typography sx={{ mt: 2 }}>{t('visualization.howBody2')}</Typography>
                            <Typography sx={{ mt: 3 }}>
                                {t('visualization.practiceTitle')}
                            </Typography>
                            <ul>
                                <li>{t('visualization.practice1')}</li>
                                <li>{t('visualization.practice2')}</li>
                                <li>{t('visualization.practice3')}</li>
                            </ul>
                            <Typography sx={{ mt: 2 }}>{t('visualization.barriers')}</Typography>
                            <Typography sx={{ mt: 2 }}>
                                <strong>{t('visualization.drillsHeading')}</strong>
                            </Typography>
                            <ol>
                                <li>{t('visualization.drill1')}</li>
                                <li>{t('visualization.drill2')}</li>
                                <li>{t('visualization.drill3')}</li>
                            </ol>
                            <Typography sx={{ mt: 2 }}>{t('visualization.losing')}</Typography>

                            <Typography sx={{ mt: 2 }}>{t('visualization.checkDrill')}</Typography>

                            <Typography sx={{ mt: 2 }}>{t('visualization.takesTime')}</Typography>

                            <Typography sx={{ mt: 2 }}>
                                <strong>{t('visualization.videosHeading')}</strong>
                            </Typography>
                            <ul>
                                <li>
                                    <Link
                                        href='https://youtu.be/UdyrXUKd30M'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        {t('visualization.video1')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/PwIOcK-P-Do'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        {t('visualization.video2')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/pzhiqSyv8v4'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        {t('visualization.video3')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/aFsELcwDBB0'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        {t('visualization.video4')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/5TQR91Mwqq0'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        {t('visualization.video5')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/gK9eXu7RmdI'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        {t('visualization.video6')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/IodUwpOEHfk'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        {t('visualization.video7')}
                                    </Link>
                                </li>
                            </ul>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>{t('studyGames.title')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>{t('studyGames.intro')}</Typography>
                            <Typography sx={{ mt: 2 }}>{t('studyGames.partnerGroup')}</Typography>
                            <Typography sx={{ mt: 3 }}>
                                <strong>{t('studyGames.goalsHeading')}</strong>
                            </Typography>
                            <ul>
                                <li>{t('studyGames.goal1')}</li>
                                <li>{t('studyGames.goal2')}</li>
                                <li>{t('studyGames.goal3')}</li>
                            </ul>
                            <Typography sx={{ mt: 3 }}>
                                <strong>{t('studyGames.howToHeading')}</strong>
                            </Typography>
                            <ul>
                                <li>{t('studyGames.howTo1')}</li>
                                <li>{t('studyGames.howTo2')}</li>
                                <li>{t('studyGames.howTo3')}</li>
                                <li>{t('studyGames.howTo4')}</li>
                                <li>{t('studyGames.howTo5')}</li>
                            </ul>
                            <Typography sx={{ mt: 2 }}>{t('studyGames.finalNote')}</Typography>

                            <Box sx={{ mt: 3, mb: 3, width: 1, aspectRatio: '1.77' }}>
                                <iframe
                                    src='https://www.youtube.com/embed/rGHf_qMR3uo'
                                    title={t('iframeTitle')}
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen={true}
                                    style={{ width: '100%', height: '100%' }}
                                    frameBorder={0}
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>{t('middlegameSparring.title')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ mt: 3, mb: 3, width: 1, aspectRatio: '1.77' }}>
                                <iframe
                                    src='https://player.vimeo.com/video/705555806'
                                    title={t('iframeTitle')}
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen={true}
                                    style={{ width: '100%', height: '100%' }}
                                    frameBorder={0}
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>{t('endgameSparring.title')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ mt: 3, mb: 3, width: 1, aspectRatio: '1.77' }}>
                                <iframe
                                    src='https://player.vimeo.com/video/694563363'
                                    title={t('iframeTitle')}
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen={true}
                                    style={{ width: '100%', height: '100%' }}
                                    frameBorder={0}
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>{t('openingSparring.title')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>{t('openingSparring.intro')}</Typography>
                            <Typography sx={{ mt: 3 }}>
                                <strong>{t('openingSparring.keyTipsTitle')}</strong>
                            </Typography>
                            <ul>
                                <li>{t('openingSparring.tip1')}</li>
                                <li>{t('openingSparring.tip2')}</li>
                                <li>{t('openingSparring.tip3')}</li>
                                <li>{t('openingSparring.tip4')}</li>
                                <li>{t('openingSparring.tip5')}</li>
                                <li>{t('openingSparring.tip6')}</li>
                                <li>{t('openingSparring.tip7')}</li>
                                <li>{t('openingSparring.tip8')}</li>
                            </ul>
                            <Typography sx={{ mt: 2 }}>{t('openingSparring.closing')}</Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>{t('botSparring.title')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>{t('botSparring.intro')}</Typography>

                            <Box sx={{ mt: 3, mb: 3, width: 1, aspectRatio: '1.77' }}>
                                <iframe
                                    src='https://www.youtube.com/embed/WsZknsdk504'
                                    title={t('iframeTitle')}
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen={true}
                                    style={{ width: '100%', height: '100%' }}
                                    frameBorder={0}
                                />
                            </Box>

                            <TableContainer component={Paper}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>
                                                {t('botSparring.tableHeaderCohort')}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>
                                                {t('botSparring.tableHeaderChesscom')}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>
                                                {t('botSparring.tableHeaderLichess')}
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {botData.map((b, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{dojoCohorts[i]}</TableCell>
                                                <TableCell>{b.chesscom}</TableCell>
                                                <TableCell>{b.lichess}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </AccordionDetails>
                    </Accordion>
                </Stack>
            </Stack>
        </Container>
    );
}

const botData = [
    { chesscom: 'Martin', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Noel', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Aron', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Zara', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Karim', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Maria', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Azeez', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Elena', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Vinh', lichess: 'RadianceEngine' },
    { chesscom: 'Wendy', lichess: 'RadianceEngine' },
    { chesscom: 'Antonio', lichess: 'RadianceEngine' },
    { chesscom: 'Pablo', lichess: 'RadianceEngine' },
    { chesscom: 'Isla', lichess: 'RadianceEngine' },
    { chesscom: 'Lorenzo', lichess: 'Boris-Trapsky' },
    { chesscom: 'Miguel', lichess: 'Boris-Trapsky' },
    { chesscom: 'Li', lichess: 'Boris-Trapsky' },
    { chesscom: 'Manuel', lichess: 'HalcyonBot' },
    { chesscom: 'Nora', lichess: 'HalcyonBot' },
    { chesscom: 'Arjun', lichess: 'Eubos' },
    { chesscom: 'Sofia', lichess: 'Eubos' },
    { chesscom: 'Luke', lichess: 'Cheng-4' },
    { chesscom: 'Wei', lichess: 'Cheng-4' },
    { chesscom: 'Paul Morphy', lichess: 'Chessatronbot' },
];
