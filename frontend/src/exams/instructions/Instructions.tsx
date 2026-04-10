import { ExamType } from '@jackstenglein/chess-dojo-common/src/database/exam';
import { Box, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import React from 'react';

interface InstructionsProps {
    length: number;
    timeLimitSeconds: number;
    type?: ExamType;
}

/**
 * Renders instructions based on the given ExamType.
 */
const Instructions: React.FC<InstructionsProps> = ({ type, ...props }) => {
    switch (type) {
        case ExamType.Tactics:
        case ExamType.Endgame:
            return <TacticsInstructions {...props} />;
        case ExamType.Polgar:
            return <PolgarMateInstructions {...props} />;
    }

    return (
        <Typography color='error'>
            Unknown Exam Type. Add new ExamType to Instructions component
        </Typography>
    );
};

export default Instructions;

/**
 * Renders instructions for tactics exams.
 */
export const TacticsInstructions: React.FC<InstructionsProps> = ({ length, timeLimitSeconds }) => {
    const t = useTranslations('exams.testInstructions');
    return (
        <>
            <Typography variant='h4' mt={4}>
                {t('heading')}
            </Typography>
            <Typography component='div'>
                <Box component='ul' sx={{ m: 0, '& li': { mt: 1 } }}>
                    <li>{t('bulletPlayBothSides')}</li>
                    <li>{t('bulletTacticsPoints')}</li>
                    <li>{t('bulletPromoteVariations')}</li>
                    <li>{t('bulletNoTactical')}</li>
                    <li>{t('bulletBoardOriented')}</li>
                    <li>{t('bulletPgnEditor')}</li>
                    <li>{t('bulletRightClick')}</li>
                    <li>
                        {t('bulletTimeLimit', {
                            minutes: Math.round(timeLimitSeconds / 60),
                            length,
                        })}
                    </li>
                    <li>{t('bulletFinishEarly')}</li>
                    <li>{t('bulletAutosave')}</li>
                </Box>
            </Typography>
        </>
    );
};

/**
 * Renders instructions for Polgar mate exams.
 */
export const PolgarMateInstructions: React.FC<InstructionsProps> = ({
    timeLimitSeconds,
    length,
}) => {
    const t = useTranslations('exams.testInstructions');
    return (
        <>
            <Typography variant='h4' mt={4}>
                {t('heading')}
            </Typography>
            <Typography component='div'>
                <Box component='ul' sx={{ m: 0, '& li': { mt: 1 } }}>
                    <li>{t('bulletPlayBothSides')}</li>
                    <li>{t('bulletPolgarPoints')}</li>
                    <li>
                        {t.rich('bulletNoTakebacks', {
                            strong: (chunks) => <strong>{chunks}</strong>,
                        })}
                    </li>
                    <li>{t('bulletBoardOriented')}</li>
                    <li>{t('bulletPgnEditor')}</li>
                    <li>{t('bulletRightClick')}</li>
                    <li>
                        {t('bulletTimeLimit', {
                            minutes: Math.round(timeLimitSeconds / 60),
                            length,
                        })}
                    </li>
                    <li>{t('bulletFinishEarly')}</li>
                    <li>{t('bulletAutosave')}</li>
                </Box>
            </Typography>
        </>
    );
};
