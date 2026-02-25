import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    {
        ignores: [
            'build/**',
            'node_modules/**',
            'coverage/**',
            'public/**',
            'playwright-report/**',
            'runner-results/**',
            'src/stockfish/engine/sf17-79.js',
            'src/stockfish/engine/sf171-79.js',
            'next-env.d.ts',
            'eslint.config.ts',
            '.next/**',
            'next.config.mjs',
        ],
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: {
            react: reactPlugin,
            'react-hooks': {
                ...reactHooks,
                configs: {
                    recommended: reactHooks.configs.recommended,
                    'recommended-latest': reactHooks.configs['recommended-latest'],
                },
            },
            '@next/next': nextPlugin,
        },
        rules: {
            ...nextPlugin.configs.recommended.rules,
            ...reactPlugin.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            'react-hooks/refs': 'warn',
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/preserve-manual-memoization': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
        rules: {
            '@typescript-eslint/no-confusing-void-expression': [
                'warn',
                { ignoreArrowShorthand: true },
            ],
            '@typescript-eslint/no-unnecessary-condition': 'off',
            '@typescript-eslint/prefer-nullish-coalescing': 'off',
            '@typescript-eslint/restrict-template-expressions': ['warn', { allowNumber: true }],
            '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
            '@typescript-eslint/no-unsafe-enum-comparison': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    ignoreRestSiblings: true,
                    argsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-misused-promises': [
                'error',
                { checksVoidReturn: { attributes: false } },
            ],
            '@typescript-eslint/no-deprecated': 'warn',
            '@typescript-eslint/no-misused-spread': 'warn',
            '@typescript-eslint/no-base-to-string': [
                'error',
                { ignoredTypeNames: ['Error', 'RegExp', 'URL', 'URLSearchParams', 'ArrayBuffer'] },
            ],
        },
    },
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsConfigRootDir: __dirname,
            },
        },
    },
    {
        rules: {
            'no-unused-vars': 'off',
            'no-console': 'error',
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-react': 'off',
            // While using React.FC, this will give false positives
            'react/prop-types': 'off',
            // React is now imported by default
            'jsx-uses-react': 'off',
            'react/no-unescaped-entities': 'off',
        },
    },
    {
        files: ['playwright/**/*.ts'],
        rules: {
            'no-console': 'off',
        },
    },
]);
