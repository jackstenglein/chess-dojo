import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    {
        ignores: ['node_modules/**'],
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: { globals: globals.browser },
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
        },
    },
]);
