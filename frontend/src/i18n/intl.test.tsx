import { render, RenderResult, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { JSX, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import messages from '~/messages/en.json';

/**
 * Renders the provided children wrapped in a NextIntlClientProvider
 * so that tests can use the useTranslations hook. The en locale is
 * used.
 * @param children The children to render.
 * @returns The result from the render call.
 */
export function renderWithIntl(children: JSX.Element): RenderResult {
    const wrap = (ui: ReactNode) => (
        <NextIntlClientProvider locale='en' messages={messages}>
            {ui}
        </NextIntlClientProvider>
    );
    const result = render(wrap(children));
    const baseRerender = result.rerender.bind(result);
    result.rerender = (ui: ReactNode) => baseRerender(wrap(ui));
    return result;
}

describe('renderWithIntl', () => {
    it('renders', () => {
        renderWithIntl(<h1>Hello, world!</h1>);

        expect(screen.getByText('Hello, world!')).toBeVisible();
    });
});
