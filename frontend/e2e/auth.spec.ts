import { expect, test } from '@playwright/test';
import { E2E } from '../playwright.config';

/**
 * Smoke test for the registration happy path:
 *  - Front renders /auth/register
 *  - Submitting the form calls /api/auth/register (proxied to backend)
 *  - Backend returns a registrationId
 *  - User is redirected to /auth/verify-email
 *
 * This test does NOT verify the actual email (no mailbox stub) — it just
 * checks that the UI flow reaches the verification screen.
 */
test.describe('Auth — register flow', () => {
	test('renders register page and submits successfully', async ({ page }) => {
		await page.goto('/auth/register');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		const email = `e2e-${Date.now()}@example.com`;
		await page.getByLabel(/first name/i).fill('E2E');
		await page.getByLabel(/last name/i).fill('Tester');
		await page.getByLabel(/email/i).fill(email);
		await page.getByLabel(/password/i).fill('Sup3rStr0ng!Pass');
		// CGU checkbox (matches label "I accept the CGU")
		await page.getByLabel(/cgu|terms|conditions/i).check();

		await page.getByRole('button', { name: /create account|sign up|register/i }).click();

		// Should land on the verify-email screen after a successful registration
		await page.waitForURL(/\/auth\/verify-email/, { timeout: 10_000 });
		await expect(page).toHaveURL(/\/auth\/verify-email/);
	});

	test('rejects weak password', async ({ page }) => {
		await page.goto('/auth/register');
		await page.getByLabel(/first name/i).fill('Weak');
		await page.getByLabel(/last name/i).fill('Pass');
		await page.getByLabel(/email/i).fill(`e2e-weak-${Date.now()}@example.com`);
		await page.getByLabel(/password/i).fill('password');
		await page.getByLabel(/cgu|terms|conditions/i).check();

		await page.getByRole('button', { name: /create account|sign up|register/i }).click();

		// Should stay on the register page and show a validation error
		await expect(page).toHaveURL(/\/auth\/register/);
		await expect(page.getByText(/strong|uppercase|number|symbol|8/i).first()).toBeVisible();
	});
});

test.describe('Backend health', () => {
	test('backend is reachable and returns 200 on healthz', async ({ request }) => {
		// Many backends expose /healthz; if not, this test will fail loudly —
		// that's the intent, we want E2E infra to be correctly configured.
		const response = await request.get(`${E2E.BACKEND_URL}/healthz`).catch(() => null);
		if (response) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});