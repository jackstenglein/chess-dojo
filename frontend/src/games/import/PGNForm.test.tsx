import { render } from '@testing-library/react';
import React from 'react';
import { expect, it } from 'vitest';
import { PGNForm } from './PGNForm';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const messages = require('../../../messages/en.json') as Record<string, unknown>;

function renderWithIntl(ui: React.ReactElement) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextIntlClientProvider } = require('next-intl') as {
        NextIntlClientProvider: React.FC<{
            locale: string;
            messages: Record<string, unknown>;
            children: React.ReactNode;
        }>;
    };
    return render(
        <NextIntlClientProvider locale='en' messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

it('renders import button', () => {
    const { getByRole } = renderWithIntl(
        <PGNForm loading={false} onClose={() => ({})} onSubmit={() => ({})} />,
    );

    expect(getByRole('button', { name: /import/i })).toBeDefined();
});
