import { metaLead } from '@/analytics/meta';
import { getSubscriptionStatus } from '@jackstenglein/chess-dojo-common/src/database/user';
import { Box, Container, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import PricingPage from '../../app/[locale]/(scoreboard)/prices/PricingPage';
import { useRequiredAuth } from '../../auth/Auth';
import { SubscriptionStatus, User, dojoCohorts } from '../../database/user';
import ExtraRatingSystemsForm from './ExtraRatingSystemsForm';
import PersonalInfoForm from './PersonalInfoForm';
import PreferredRatingSystemForm from './PreferredRatingSystemForm';
import ReferralSourceForm from './ReferralSourceForm';

interface StepProps {
    label: string;
    optional: boolean;
    form: React.FC<ProfileCreatorFormProps>;
}

export interface ProfileCreatorFormProps {
    user: User;
    onNextStep: () => void;
    onPrevStep: () => void;
}

function getActiveStep(user?: User): number {
    if (!user) {
        return 0;
    }
    if (user.displayName.trim() === '') {
        return 0;
    }
    if (
        user.dojoCohort === '' ||
        user.dojoCohort === 'NO_COHORT' ||
        (user.ratingSystem as string) === '' ||
        !dojoCohorts.includes(user.dojoCohort)
    ) {
        return 1;
    }
    return 2;
}

const ProfileCreatorPage = () => {
    const t = useTranslations('profile.creator');
    const { user } = useRequiredAuth();
    const [activeStep, setActiveStep] = useState(getActiveStep(user));
    const [showPricingPage, setShowPricingPage] = useState(true);

    const steps: StepProps[] = useMemo(
        () => [
            {
                label: t('stepPersonalInformation'),
                optional: false,
                form: PersonalInfoForm,
            },
            {
                label: t('stepDojoCohort'),
                optional: false,
                form: PreferredRatingSystemForm,
            },
            {
                label: t('stepExtraRatingSystems'),
                optional: true,
                form: ExtraRatingSystemsForm,
            },
            {
                label: t('stepReferralSource'),
                optional: false,
                form: ReferralSourceForm,
            },
        ],
        [t],
    );

    const Form = steps[activeStep].form;

    const onFreeTier = () => {
        setShowPricingPage(false);
        metaLead();
    };

    if (
        showPricingPage &&
        getSubscriptionStatus(user) !== SubscriptionStatus.Subscribed &&
        activeStep === 0
    ) {
        return <PricingPage onFreeTier={onFreeTier} />;
    }

    return (
        <Container maxWidth='md' sx={{ pt: 6, pb: 4 }}>
            <Typography variant='h6'>{t('createProfile')}</Typography>
            <Stepper activeStep={activeStep}>
                {steps.map((s) => (
                    <Step key={s.label}>
                        <StepLabel
                            optional={
                                s.optional && (
                                    <Typography variant='caption'>{t('stepOptional')}</Typography>
                                )
                            }
                        >
                            {s.label}
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>
            <Box
                sx={{
                    mt: 5,
                }}
            >
                <Form
                    user={user}
                    onNextStep={() => setActiveStep(activeStep + 1)}
                    onPrevStep={() => setActiveStep(activeStep - 1)}
                />
            </Box>
        </Container>
    );
};

export default ProfileCreatorPage;
