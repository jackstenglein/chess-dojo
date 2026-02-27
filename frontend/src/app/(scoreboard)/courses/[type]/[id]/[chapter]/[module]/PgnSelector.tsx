import { Link } from '@/components/navigation/Link';
import { PgnHeaders } from '@/database/game';
import { Header } from '@jackstenglein/chess';
import { type Tags as PgnParserTags } from '@jackstenglein/pgn-parser';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
    Button,
    Card,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    Stack,
    Typography,
} from '@mui/material';

type PermissiveHeaders = PgnParserTags | Record<string, undefined> | PgnHeaders;

function getPgnName(header: PermissiveHeaders): string {
    // We do not expect a case where header.PgnName is an object,
    // but we must make the compiler happy.
    if (header.PgnName && typeof header.PgnName !== 'object') {
        return header.PgnName;
    }

    return `${header.White} - ${header.Black}`;
}

interface PgnSelectorProps {
    pgns?: string[];
    headers?: PermissiveHeaders[];
    selectedIndex: number;
    setSelectedIndex: (i: number) => void;
    completed?: boolean[];
    fullHeight?: boolean;
    hiddenCount?: number;
    noCard?: boolean;
}

const PgnSelector: React.FC<PgnSelectorProps> = ({
    pgns,
    headers,
    selectedIndex,
    setSelectedIndex,
    completed,
    fullHeight,
    hiddenCount,
    noCard,
}) => {
    let selectedHeaders: PermissiveHeaders[] = [];
    if (headers) {
        selectedHeaders = headers;
    } else if (pgns) {
        selectedHeaders = pgns.map((pgn) => {
            return new Header({ pgn: pgn.split('\n\n')[0] }).tags;
        });
    }

    const items = (
        <>
            <List>
                {selectedHeaders.map((header, idx) => (
                    <ListItem data-testid='pgn-selector-item' key={idx} disablePadding>
                        <ListItemButton
                            sx={{ pl: 0 }}
                            selected={selectedIndex === idx}
                            onClick={() => setSelectedIndex(idx)}
                        >
                            <ListItemIcon sx={{ minWidth: '40px' }}>
                                <Stack alignItems='center' width={1}>
                                    <Typography
                                        sx={{
                                            color: 'primary.main',
                                        }}
                                    >
                                        {idx + 1}
                                    </Typography>
                                </Stack>
                            </ListItemIcon>
                            <Stack
                                direction='row'
                                justifyContent='space-between'
                                width={1}
                                spacing={1}
                            >
                                <Typography key={idx} variant='body2'>
                                    {getPgnName(header)}
                                </Typography>

                                {completed !== undefined ? (
                                    completed[idx] && <CheckCircleIcon color='success' />
                                ) : (
                                    <Typography variant='caption'>{header.Result}</Typography>
                                )}
                            </Stack>
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            {hiddenCount !== undefined && hiddenCount > 0 && (
                <Stack data-testid='upsell-message' px={1} mt={2} spacing={2} alignItems='center'>
                    <Typography textAlign='center'>
                        Unlock {hiddenCount} more game
                        {hiddenCount > 1 ? 's' : ''} by upgrading to a full account
                    </Typography>
                    <Button variant='outlined' component={Link} href='/prices'>
                        View Prices
                    </Button>
                </Stack>
            )}
        </>
    );

    if (noCard) {
        return items;
    }

    return (
        <Card
            sx={{
                gridArea: 'extras',
                width: 1,
                maxHeight: fullHeight ? 1 : '18em',
                overflowY: 'scroll',
                flexGrow: fullHeight ? 1 : undefined,
            }}
            data-testid='pgn-selector'
        >
            {items}
        </Card>
    );
};

export default PgnSelector;
