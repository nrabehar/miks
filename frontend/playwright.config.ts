import { defineConfig, devices } from '@playwright/test';

const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173';
const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:3000';

export default defineConfig({
	testDir: './e2e',
	timeout: 30_000,
	expect: { timeout: 5_000 },
	fullyParallel: false,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: FRONTEND_URL,
		trace: 'on-first-retry',
		actionTimeout: 5_000,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: [
		{
			command: 'npm run dev',
			url: FRONTEND_URL,
			reuseExistingServer: !process.env.CI,
			timeout: 60_000,
		},
	],
});

// Re-export URLs for tests to use directly.
export const E2E = { FRONTEND_URL, BACKEND_URL };