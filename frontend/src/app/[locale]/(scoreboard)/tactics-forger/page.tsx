import { Box } from '@mui/material';
import { TACTICS_FORGER_VERSION } from './version';

/**
 * Dojo Tactics Forger: a self-contained tactics trainer (tactics, openings and endgames ladders)
 * built as a static app in public/static/tactics-forger/<version>. It's shown here, under the
 * site navbar, in a full-height frame. The version folder changes on every export, so the
 * long-lived cache on /static never serves an outdated copy.
 */
export default function TacticsForgerPage() {
    return (
        <Box
            component='iframe'
            title='Dojo Tactics Forger'
            src={`/static/tactics-forger/${TACTICS_FORGER_VERSION}/index.html`}
            sx={{
                display: 'block',
                width: 1,
                height: 'calc(100dvh - var(--navbar-height))',
                border: 0,
            }}
        />
    );
}
