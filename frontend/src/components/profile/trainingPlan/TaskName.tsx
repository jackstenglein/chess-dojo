import { Box } from '@mui/material';
import { splitDisplayName } from './taskVerb';
import { TaskVerbIcon } from './TaskVerbIcon';

/**
 * A task's name with its verb shown as an icon: "Watch How to Make 1900" reads as a
 * video icon and "How to Make 1900".
 */
export function TaskName({
    name,
    iconColor,
}: {
    name: string;
    /** The icon's colour; it follows the text when not given. */
    iconColor?: string;
}) {
    const { verb, rest } = splitDisplayName(name);
    return (
        <Box component='span'>
            {verb && (
                <Box
                    component='span'
                    sx={{
                        display: 'inline-flex',
                        verticalAlign: '-0.15em',
                        mr: 0.75,
                        '& [role=img]': { color: iconColor ?? 'inherit' },
                    }}
                >
                    <TaskVerbIcon verb={verb} size='1em' />
                </Box>
            )}
            {rest}
        </Box>
    );
}
