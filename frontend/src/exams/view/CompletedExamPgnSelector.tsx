import {
    Button,
    CardContent,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Scores } from '../../app/(scoreboard)/tests/[type]/[id]/exam/ExamPage';
import { ExamPgnSelectorProps, formatTime } from './ExamPgnSelector';

interface CompletedExamPgnSelectorProps extends Omit<
    ExamPgnSelectorProps,
    'countdown' | 'onComplete' | 'orientations'
> {
    elapsedTime: number;
    onReset: () => void;
    resetLabel?: string;
    scores?: Scores;
    attempt: number;
    selectAttempt: (v: number) => void;
    maxAttempts: number;
}

const CompletedExamPgnSelector: React.FC<CompletedExamPgnSelectorProps> = ({
    name,
    cohortRange,
    count,
    selected,
    onSelect,
    scores,
    onReset,
    resetLabel,
    elapsedTime,
    attempt,
    selectAttempt,
    maxAttempts,
    pgnNames,
}) => {
    return (
        <CardContent>
            <Stack alignItems='center' mb={3}>
                <Typography variant='h6' color='text.secondary'>
                    {cohortRange}: {name}
                </Typography>
            </Stack>
            <Stack spacing={3} direction='row' alignItems='center' justifyContent='center'>
                <Stack alignItems='center'>
                    <TextField
                        select
                        value={attempt}
                        onChange={(e) => selectAttempt(parseInt(e.target.value))}
                        fullWidth
                        size='small'
                        sx={{ mb: 1 }}
                    >
                        {Array.from(Array(maxAttempts)).map((_, i) => (
                            <MenuItem key={i} value={`${i}`}>
                                Attempt #{i + 1}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Typography variant='subtitle1'>
                        Total Score: {scores?.total.user} / {scores?.total.solution}
                    </Typography>
                    <Typography variant='subtitle1'>
                        Time Used: {formatTime(elapsedTime || 0)}
                    </Typography>
                </Stack>
            </Stack>

            <List sx={{ mt: 2 }}>
                {Array.from(Array(count)).map((_, i) => (
                    <ListItem key={i} disablePadding>
                        <ListItemButton selected={i === selected} onClick={() => onSelect(i)}>
                            <ListItemIcon sx={{ minWidth: '40px' }}>
                                <Stack alignItems='center' width={1}>
                                    <Typography
                                        sx={{
                                            color: 'primary.main',
                                        }}
                                    >
                                        {i + 1}
                                    </Typography>
                                </Stack>
                            </ListItemIcon>
                            <Stack
                                direction='row'
                                justifyContent='space-between'
                                width={1}
                                spacing={1}
                            >
                                <Typography>{pgnNames?.[i] || `Problem ${i + 1}`}</Typography>

                                {scores && (
                                    <Typography>
                                        {scores.problems[i].user} / {scores.problems[i].solution}
                                    </Typography>
                                )}
                            </Stack>
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Stack alignItems='center' mt={3}>
                <Button variant='contained' onClick={onReset}>
                    {resetLabel || 'Reset Sample'}
                </Button>
            </Stack>
        </CardContent>
    );
};

export default CompletedExamPgnSelector;
