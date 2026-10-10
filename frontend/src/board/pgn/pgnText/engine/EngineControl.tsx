import { createContext } from 'react';

/**
 * A page that owns the engine switch. The section then renders only while the page has the
 * engine on, and its switch calls the page's setter. Without a provider the section keeps its
 * own switch.
 */
export interface EngineControl {
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
}

export const EngineControlContext = createContext<EngineControl | undefined>(undefined);
