'use client';

import NextError from 'next/error';

// Root-level not-found is a self-contained document because the root
// layout is a passthrough and does not render <html>/<body>. This page
// fires for requests that fall outside the proxy matcher and therefore
// never hit `[locale]/`, so we can't rely on the localized not-found
// page or the NextIntlClientProvider tree.
export default function NotFound() {
    return (
        <html lang='en'>
            <body>
                <NextError statusCode={404} />
            </body>
        </html>
    );
}
