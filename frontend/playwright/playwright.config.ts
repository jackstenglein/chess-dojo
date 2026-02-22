import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({
    path: [
        path.join(__dirname, '../.env.test.local'),
        path.join(__dirname, '../.env.local'),
        path.join(__dirname, '../.env.test'),
        path.join(__dirname, '../.env'),
    ],
});

const isCI = !!process.env.CI;

export default defineConfig({
    testDir: './tests',
    testIgnore: ['**/*.test.ts', '**/node_modules/**'],
    timeout: 30000,
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? 3 : undefined,
    reporter: 'html',

    use: {
        baseURL: 'http://localhost:3000',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        timezoneId: 'Etc/GMT+0',
    },

    projects: [
        // Setup project - authenticates and saves session
        { name: 'setup', testMatch: /.*\.setup\.ts$/ },

        // Auth tests - run WITHOUT authentication (testing login/signup flows)
        {
            name: 'auth',
            testMatch: /.*\/auth\/.*\.spec\.ts$/,
            use: {
                ...devices['Desktop Chrome'],
                // No storageState - tests run unauthenticated
            },
            // No dependencies - these tests don't need prior auth
        },

        // E2E tests - run WITH authentication
        {
            name: 'e2e',
            testMatch: /.*\.spec\.ts$/,
            testIgnore: ['**/auth/**'], // Auth tests handled by 'auth' project
            use: {
                ...devices['Desktop Chrome'],
                storageState: path.join(__dirname, '.auth/user.json'),
            },
            dependencies: ['setup'],
        },
    ],

    webServer: {
        command: 'npm run start:build',
        url: 'http://localhost:3000',
        reuseExistingServer: !isCI,
        cwd: path.join(__dirname, '..'),
    },
});
