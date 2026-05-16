import { AbstractIntlMessages } from 'next-intl';

/** Drops the authoring-guidance `_translationMeta` block before passing messages to next-intl. */
export function stripMeta(messages: AbstractIntlMessages): AbstractIntlMessages {
    const { _translationMeta: _meta, ...rest } = messages as Record<string, unknown>;
    return rest as AbstractIntlMessages;
}
