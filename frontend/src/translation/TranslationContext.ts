import { Translation } from '@/api/translationApi';
import { createContext, useContext } from 'react';

export interface TranslationContextValue {
    translations: ReadonlyMap<string, Translation>;
    locale: string;
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
