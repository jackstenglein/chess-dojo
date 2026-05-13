import { AbstractIntlMessages } from 'next-intl';

export function stripMeta(messages: AbstractIntlMessages): AbstractIntlMessages {
    const { _translationMeta: _meta, ...rest } = messages as Record<string, unknown>;
    return rest as AbstractIntlMessages;
}
