import {
    CreateGameRequest,
    GameImportType,
    GameImportTypes,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { DesktopMacOutlined, UploadFile } from '@mui/icons-material';
import {
    Card,
    CardActionArea,
    CardContent,
    CircularProgress,
    Dialog,
    Grid,
    Stack,
    SvgIconProps,
    SvgIconTypeMap,
    Typography,
} from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { useState, type JSX } from 'react';
import BoardIcon from '../../style/BoardIcon';
import KingRookIcon from '../../style/KingRookIcon';
import { OnlineGameForm } from './OnlineGameForm';
import { PGNForm } from './PGNForm';
import { PositionForm } from './PositionForm';

interface ImportWizardProps {
    loading: boolean;
    onSubmit: (game: CreateGameRequest) => void;
}

export const ImportWizard = ({ onSubmit, loading }: ImportWizardProps) => {
    const [selected, setSelected] = useState<GameImportType>();
    const [dialog, setDialog] = useState<string>();

    const onSelect = (req: CreateGameRequest) => {
        setSelected(req.type);
        onSubmit(req);
    };

    const onCloseDialog = () => {
        setDialog('');
    };

    return (
        <Grid container rowSpacing={2} columnSpacing={2}>
            <ImportSourceCard
                name='Starting Position'
                description='Annotate a blank game'
                icon={KingRookIcon}
                loading={selected === GameImportTypes.startingPosition && loading}
                disabled={loading}
                onClick={() => {
                    onSelect({ type: GameImportTypes.startingPosition, pgnText: '' });
                }}
                id='import-starting-position'
            />

            <ImportSourceCard
                name='Online Game'
                description='Import from Chess.com or Lichess'
                icon={DesktopMacOutlined}
                loading={dialog === 'online' && loading}
                disabled={loading}
                onClick={() => {
                    setDialog('online');
                }}
                id='import-online-game'
            />

            <ImportSourceCard
                name='PGN'
                description='Import from PGN file'
                icon={UploadFile}
                loading={dialog === 'pgn' && loading}
                disabled={loading}
                onClick={() => {
                    setDialog('pgn');
                }}
                id='import-pgn-text'
            />

            <ImportSourceCard
                name='Custom Position'
                description='Annotate from a custom position'
                icon={BoardIcon}
                loading={dialog === 'position' && loading}
                disabled={loading}
                onClick={() => {
                    setDialog('position');
                }}
                id='import-custom-position'
            />

            <Dialog open={!!dialog} onClose={onCloseDialog} fullWidth scroll='body'>
                {dialog === 'online' && (
                    <OnlineGameForm loading={loading} onSubmit={onSelect} onClose={onCloseDialog} />
                )}
                {dialog === 'pgn' && (
                    <PGNForm loading={loading} onSubmit={onSelect} onClose={onCloseDialog} />
                )}
                {dialog === 'position' && (
                    <PositionForm loading={loading} onSubmit={onSelect} onClose={onCloseDialog} />
                )}
            </Dialog>
        </Grid>
    );
};

export default ImportWizard;

export interface ImportDialogProps {
    loading: boolean;
    onSubmit: (game: CreateGameRequest) => void;
    onClose: () => void;
}

interface ImportSourceCardProps {
    name: string;
    id: string;
    description: string;
    icon:
        | ((props: SvgIconProps) => JSX.Element)
        | (OverridableComponent<SvgIconTypeMap> & { muiName: string });
    onClick?: () => void;
    loading?: boolean;
    disabled?: boolean;
}

const ImportSourceCard = ({
    name,
    id,
    description,
    icon,
    onClick,
    loading,
    disabled,
}: ImportSourceCardProps) => {
    const Icon = icon;
    return (
        <Grid
            size={{
                xs: 12,
                sm: 6,
            }}
        >
            <Card sx={{ height: 1 }}>
                <CardActionArea
                    sx={{ height: 1 }}
                    onClick={onClick}
                    data-testid={id}
                    disabled={disabled}
                >
                    <CardContent>
                        <Stack
                            height={1}
                            justifyContent='center'
                            alignItems='center'
                            textAlign='center'
                            sx={{ opacity: !loading && disabled ? 0.8 : 1 }}
                        >
                            {loading ? (
                                <CircularProgress size='5rem' sx={{ mb: 2 }} />
                            ) : (
                                <Icon sx={{ fontSize: '5rem', mb: 2 }} color='primary' />
                            )}
                            <Typography variant='h5' mb={0.5}>
                                {name}
                            </Typography>
                            <Typography variant='subtitle1' color='text.secondary' lineHeight='1.3'>
                                {description}
                            </Typography>
                        </Stack>
                    </CardContent>
                </CardActionArea>
            </Card>
        </Grid>
    );
};
