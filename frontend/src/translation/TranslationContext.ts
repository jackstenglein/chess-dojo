import { Translation } from '@/api/translationApi';
import { createContext, useContext } from 'react';

/** State exposed by the TranslationProvider to consumer hooks. */
export interface TranslationContextValue {
    translations: ReadonlyMap<string, Translation>;
    locale: string;
    /** True when one or both channels failed to load; always false on the default locale. */
    fetchFailed: boolean;
}

const defaultContext: TranslationContextValue = {
    translations: new Map(),
    locale: 'en',
    fetchFailed: false,
};

export const TranslationContext = createContext<TranslationContextValue>(defaultContext);

export function useTranslationContext(): TranslationContextValue {
    return useContext(TranslationContext);
}
