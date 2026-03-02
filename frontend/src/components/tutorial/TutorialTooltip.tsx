import CloseButton from '@/components/ui/CloseButton';
import ScoreboardProgress from '@/scoreboard/ScoreboardProgress';
import { Box, Button, Card, CardActions, CardContent, CardHeader, Typography } from '@mui/material';
import { TooltipRenderProps } from 'react-joyride-react19-compat';

const TutorialTooltip: React.FC<TooltipRenderProps> = ({
    index,
    step,
    tooltipProps,
    primaryProps,
    backProps,
    size,
    isLastStep,
    closeProps,
}) => {
    return (
        <Card
            data-testid='tutorial-tooltip'
            sx={{ maxWidth: 'md', width: { xs: '95vw', sm: undefined } }}
            {...tooltipProps}
        >
            <CardHeader title={step.title} action={<CloseButton onClose={closeProps.onClick} />} />
            <CardContent>
                <Typography>{step.content}</Typography>
            </CardContent>
            <CardActions>
                {index > 0 && <Button {...backProps}>Back</Button>}
                <Button variant='contained' color='primary' onClick={primaryProps.onClick}>
                    {isLastStep ? 'Close' : 'Next'}
                </Button>
                <Box sx={{ ml: 2, flexGrow: 1 }}>
                    <ScoreboardProgress min={0} max={size} value={index + 1} />
                </Box>
            </CardActions>
        </Card>
    );
};

export default TutorialTooltip;
