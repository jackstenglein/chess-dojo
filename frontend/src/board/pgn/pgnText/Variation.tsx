import { EventType } from '@jackstenglein/chess';
import { Box, Grid, Paper } from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { useChess } from '../PgnBoard';
import { InlineNotationSetting } from '../boardTools/underboard/settings/ViewerSettings';
import MoveDisplay from './MoveDisplay';

interface VariationProps {
    handleScroll: (child: HTMLElement | null) => void;
}

const Variation: React.FC<VariationProps> = ({ handleScroll }) => {
    const { chess, solitaire } = useChess();
    const [, setForceRender] = useState(0);
    const [inlineNotation] = useLocalStorage<boolean>(
        InlineNotationSetting.key,
        InlineNotationSetting.default,
    );

    useEffect(() => {
        if (chess) {
            const observer = {
                types: [
                    EventType.Initialized,
                    EventType.LegalMove,
                    EventType.NewVariation,
                    EventType.DeleteMove,
                    EventType.DeleteBeforeMove,
                    EventType.PromoteVariation,
                    EventType.UpdateComment,
                    EventType.UpdateNags,
                    EventType.UpdateCommand,
                ],
                handler: () => {
                    setForceRender((v) => v + 1);
                },
            };

            chess.addObserver(observer);
            return () => chess.removeObserver(observer);
        }
    }, [chess, setForceRender]);

    let moves = chess?.history();
    if (solitaire?.enabled && !solitaire.complete) {
        if (solitaire.currentMove) {
            const index = moves?.findIndex((m) => m === solitaire.currentMove);
            if (index !== undefined) {
                moves = moves?.slice(0, index + 1);
            }
        } else {
            moves = [];
        }
    }

    return (
        <Paper sx={{ boxShadow: 'none' }}>
            {inlineNotation ? (
                <Box sx={{ p: 1, lineHeight: 1.8 }}>
                    {moves?.map((move) => {
                        return (
                            <MoveDisplay
                                move={move}
                                handleScroll={handleScroll}
                                key={move.ply}
                                forceInline={true}
                            />
                        );
                    })}
                </Box>
            ) : (
                <Grid container>
                    {moves?.map((move) => {
                        return (
                            <MoveDisplay move={move} handleScroll={handleScroll} key={move.ply} />
                        );
                    })}
                </Grid>
            )}
        </Paper>
    );
};

export default Variation;
