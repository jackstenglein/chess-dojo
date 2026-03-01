import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    test: {
        environment: 'happy-dom',
        include: ['./src/**/*.test.ts', './src/**/*.test.tsx'],
        setupFiles: ['./src/setupTests.ts'],
        deps: {
            optimizer: {
                web: {
                    enabled: true,
                    include: ['react-charts'],
                },
            },
        },
    },
});
