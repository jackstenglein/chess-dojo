import { metaLead } from '@/analytics/meta';
import { getSubscriptionStatus } from '@jackstenglein/chess-dojo-common/src/database/user';
import { Box, Container, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useState } from 'react';
import PricingPage from '../../app/(scoreboard)/prices/PricingPage';
import { useRequiredAuth } from '../../auth/Auth';
import { SubscriptionStatus, User, dojoCohorts } from '../../database/user';
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

const steps: StepProps[] = [
    {
        label: 'Personal Information',
        optional: false,
        form: PersonalInfoForm,
    },
    {
        label: 'Rating Systems',
        optional: false,
        form: PreferredRatingSystemForm,
    },
    {
        label: 'Referral Source',
        optional: false,
        form: ReferralSourceForm,
    },
];

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
    const { user } = useRequiredAuth();
    const [activeStep, setActiveStep] = useState(getActiveStep(user));
    const [showPricingPage, setShowPricingPage] = useState(true);

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
            <Typography variant='h6'>Create Profile</Typography>
            <Stepper activeStep={activeStep}>
                {steps.map((s) => (
                    <Step key={s.label}>
                        <StepLabel
                            optional={
                                s.optional && <Typography variant='caption'>Optional</Typography>
                            }
                        >
                            {s.label}
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>
            <Box mt={5}>
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
