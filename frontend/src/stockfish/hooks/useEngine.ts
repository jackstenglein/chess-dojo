import { useEffect, useState } from 'react';
import { EngineName } from '../engine/engine';
import { createStockfishEngine } from '../engine/StockfishEngineFactory';
import { UciEngineFactory } from '../engine/UciEngineFactory';

export const useEngine = (enabled: boolean, engineName: EngineName | undefined) => {
    const [engine, setEngine] = useState<UciEngineFactory>();

    useEffect(() => {
        if (!engineName || !enabled) return;

        pickEngine(engineName)
            .then((newEngine) => {
                setEngine((prev) => {
                    prev?.shutdown();
                    return newEngine;
                });
            })
            .catch((error) => {
                // eslint-disable-next-line no-console
                console.error('Failed to pick engine:', error);
            });
    }, [engineName, enabled]);

    return engine;
};

const pickEngine = (engine: EngineName): Promise<UciEngineFactory> => {
    return createStockfishEngine(engine);
};
