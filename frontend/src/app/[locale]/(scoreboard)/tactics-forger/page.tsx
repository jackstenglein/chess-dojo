import { TacticsForgerFrame } from './TacticsForgerFrame';
import { TACTICS_FORGER_VERSION } from './version';

/**
 * Dojo Tactics Forger: a self-contained tactics trainer (tactics, openings and endgames ladders)
 * built as a static app in public/static/tactics-forger/<version>. It's shown here, under the
 * site navbar, in a full-height frame that also loads and saves the user's progress. The version
 * folder changes on every export, so the long-lived cache on /static never serves an old copy.
 */
export default function TacticsForgerPage() {
    return (
        <TacticsForgerFrame src={`/static/tactics-forger/${TACTICS_FORGER_VERSION}/index.html`} />
    );
}
