// Passthrough layout. Providers live in [locale]/layout.tsx so
// setRequestLocale runs before any next-intl hook reads the request config.
// Required by Next because app/not-found.tsx exists outside the segment.
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return children;
}
