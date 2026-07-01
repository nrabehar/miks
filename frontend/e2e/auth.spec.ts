import { expect, test, type Page } from '@playwright/test'

// ─── Mock helpers ─────────────────────────────────────────────────────────────
// All API calls go through /api/* (Vite proxy prefix added by apiClient).
// Playwright intercepts before the proxy so no real server is ever hit.

function mockRoute(page: Page, method: string, path: string, status: number, body: unknown) {
	return page.route(`**/api${path}`, (route) => {
		if (route.request().method() !== method) return route.continue()
		route.fulfill({
			status,
			contentType: 'application/json',
			body: JSON.stringify(body),
		})
	})
}

// The _authed beforeLoad always POSTs /auth/refresh first.
// Return 401 so auth pages stay on their route (no redirect loop).
async function blockRefresh(page: Page) {
	await mockRoute(page, 'POST', '/auth/refresh', 401, { message: 'Unauthorized' })
}

// ─── Register ─────────────────────────────────────────────────────────────────

test.describe('Register', () => {
	test.beforeEach(async ({ page }) => {
		await blockRefresh(page)
	})

	test('happy path — submits and lands on verify-email', async ({ page }) => {
		await mockRoute(page, 'POST', '/auth/register', 201, {
			registrationId: 'reg-test-abc',
			emailSent: true,
		})

		await page.goto('/auth/register')
		await page.getByLabel(/first name/i).fill('Jane')
		await page.getByLabel(/last name/i).fill('Doe')
		await page.getByLabel(/^email/i).fill('jane.doe@example.com')

		const [pwd, confirm] = await page.getByLabel(/password/i).all()
		await pwd.fill('Str0ng!Pass')
		await confirm.fill('Str0ng!Pass')

		await page.getByLabel(/cgu|terms/i).check()
		await page.getByRole('button', { name: /create account/i }).click()

		await page.waitForURL(/\/auth\/verify-email/, { timeout: 8_000 })
		await expect(page).toHaveURL(/\/auth\/verify-email/)
	})

	test('shows error toast when email is already taken', async ({ page }) => {
		await mockRoute(page, 'POST', '/auth/register', 400, {
			message: 'An account with this email already exists.',
		})

		await page.goto('/auth/register')
		await page.getByLabel(/first name/i).fill('Jane')
		await page.getByLabel(/last name/i).fill('Doe')
		await page.getByLabel(/^email/i).fill('taken@example.com')

		const [pwd, confirm] = await page.getByLabel(/password/i).all()
		await pwd.fill('Str0ng!Pass')
		await confirm.fill('Str0ng!Pass')

		await page.getByLabel(/cgu|terms/i).check()
		await page.getByRole('button', { name: /create account/i }).click()

		await expect(page.getByText(/already exists|email taken/i)).toBeVisible({ timeout: 5_000 })
		await expect(page).toHaveURL(/\/auth\/register/)
	})

	test('blocks submission when CGU is not checked (local validation)', async ({ page }) => {
		// No API mock needed — Zod should reject before any fetch
		let apiCalled = false
		await page.route('**/api/auth/register', () => { apiCalled = true })

		await page.goto('/auth/register')
		await page.getByLabel(/first name/i).fill('Jane')
		await page.getByLabel(/last name/i).fill('Doe')
		await page.getByLabel(/^email/i).fill('jane@example.com')

		const [pwd, confirm] = await page.getByLabel(/password/i).all()
		await pwd.fill('Str0ng!Pass')
		await confirm.fill('Str0ng!Pass')

		// CGU deliberately left unchecked
		await page.getByRole('button', { name: /create account/i }).click()

		await expect(page).toHaveURL(/\/auth\/register/)
		expect(apiCalled).toBe(false)
	})

	test('blocks submission on weak password (local validation)', async ({ page }) => {
		let apiCalled = false
		await page.route('**/api/auth/register', () => { apiCalled = true })

		await page.goto('/auth/register')
		await page.getByLabel(/first name/i).fill('Jane')
		await page.getByLabel(/last name/i).fill('Doe')
		await page.getByLabel(/^email/i).fill('jane@example.com')

		const [pwd, confirm] = await page.getByLabel(/password/i).all()
		await pwd.fill('password') // weak — no uppercase, number, or symbol
		await confirm.fill('password')

		await page.getByLabel(/cgu|terms/i).check()
		await page.getByRole('button', { name: /create account/i }).click()

		await expect(page).toHaveURL(/\/auth\/register/)
		expect(apiCalled).toBe(false)
	})

	test('blocks submission when passwords do not match (local validation)', async ({ page }) => {
		let apiCalled = false
		await page.route('**/api/auth/register', () => { apiCalled = true })

		await page.goto('/auth/register')
		await page.getByLabel(/first name/i).fill('Jane')
		await page.getByLabel(/last name/i).fill('Doe')
		await page.getByLabel(/^email/i).fill('jane@example.com')

		const [pwd, confirm] = await page.getByLabel(/password/i).all()
		await pwd.fill('Str0ng!Pass')
		await confirm.fill('Different!99X')

		await page.getByLabel(/cgu|terms/i).check()
		await page.getByRole('button', { name: /create account/i }).click()

		await expect(page).toHaveURL(/\/auth\/register/)
		expect(apiCalled).toBe(false)
	})
})

// ─── Login ────────────────────────────────────────────────────────────────────

test.describe('Login', () => {
	const MOCK_USER = {
		id: 'user-1',
		email: 'jane@example.com',
		firstName: 'Jane',
		lastName: 'Doe',
		phone: null,
		avatarUrl: null,
		language: 'fr',
		twoFaEnabled: false,
		phoneVerified: false,
		isOnline: true,
	}

	test.beforeEach(async ({ page }) => {
		await blockRefresh(page)
	})

	test('happy path — logs in and lands on dashboard', async ({ page }) => {
		await mockRoute(page, 'POST', '/auth/login', 200, {
			requires2FA: false,
			accessToken: 'mock-access-token',
			user: MOCK_USER,
		})
		// Dashboard will call /auth/refresh on _authed beforeLoad — serve a valid session
		await page.unroute('**/api/auth/refresh')
		await mockRoute(page, 'POST', '/auth/refresh', 200, { accessToken: 'mock-access-token' })
		await mockRoute(page, 'GET', '/auth/me', 200, MOCK_USER)
		await mockRoute(page, 'GET', '/workspaces', 200, [])
		await mockRoute(page, 'GET', '/notifications/count', 200, { count: 0 })

		await page.goto('/auth/login')
		await page.getByLabel(/email|identifier/i).fill('jane@example.com')
		await page.getByLabel(/password/i).fill('Str0ng!Pass')
		await page.getByRole('button', { name: /sign in/i }).click()

		await page.waitForURL(/\/dashboard/, { timeout: 8_000 })
		await expect(page).toHaveURL(/\/dashboard/)
	})

	test('shows error on invalid credentials', async ({ page }) => {
		await mockRoute(page, 'POST', '/auth/login', 401, {
			message: 'Invalid credentials',
		})

		await page.goto('/auth/login')
		await page.getByLabel(/email|identifier/i).fill('wrong@example.com')
		await page.getByLabel(/password/i).fill('WrongPass1!')
		await page.getByRole('button', { name: /sign in/i }).click()

		await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5_000 })
		await expect(page).toHaveURL(/\/auth\/login/)
	})

	test('shows 2FA step when backend requires it', async ({ page }) => {
		await mockRoute(page, 'POST', '/auth/login', 200, {
			requires2FA: true,
			challengeId: 'challenge-xyz',
		})

		await page.goto('/auth/login')
		await page.getByLabel(/email|identifier/i).fill('jane@example.com')
		await page.getByLabel(/password/i).fill('Str0ng!Pass')
		await page.getByRole('button', { name: /sign in/i }).click()

		// Should show the 2FA OTP form
		await expect(page.getByText(/two.factor|authenticator|6.digit/i)).toBeVisible({ timeout: 5_000 })
	})

	test('2FA — submits code and lands on dashboard', async ({ page }) => {
		await mockRoute(page, 'POST', '/auth/login', 200, {
			requires2FA: true,
			challengeId: 'challenge-xyz',
		})
		await mockRoute(page, 'POST', '/auth/2fa/verify', 200, {
			accessToken: 'mock-access-token',
			user: MOCK_USER,
		})
		await page.unroute('**/api/auth/refresh')
		await mockRoute(page, 'POST', '/auth/refresh', 200, { accessToken: 'mock-access-token' })
		await mockRoute(page, 'GET', '/auth/me', 200, MOCK_USER)
		await mockRoute(page, 'GET', '/workspaces', 200, [])
		await mockRoute(page, 'GET', '/notifications/count', 200, { count: 0 })

		await page.goto('/auth/login')
		await page.getByLabel(/email|identifier/i).fill('jane@example.com')
		await page.getByLabel(/password/i).fill('Str0ng!Pass')
		await page.getByRole('button', { name: /sign in/i }).click()

		// Wait for OTP step
		await expect(page.getByText(/two.factor|authenticator|6.digit/i)).toBeVisible({ timeout: 5_000 })

		// Fill all 6 OTP inputs
		const otpInputs = page.locator('input[inputmode="numeric"], input[type="text"][maxlength="1"]')
		for (let i = 0; i < 6; i++) {
			await otpInputs.nth(i).fill(String(i + 1))
		}

		await page.getByRole('button', { name: /verify/i }).click()
		await page.waitForURL(/\/dashboard/, { timeout: 8_000 })
	})
})

// ─── Verify Email ─────────────────────────────────────────────────────────────

test.describe('Verify email', () => {
	test.beforeEach(async ({ page }) => {
		await blockRefresh(page)
	})

	test('shows form when session exists in sessionStorage', async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('miks_registration_id', 'reg-test-abc')
			sessionStorage.setItem('miks_registration_email', 'jane@example.com')
		})

		await page.goto('/auth/verify-email')
		// Should show an OTP input, not the "no session" error
		await expect(page.getByText(/no verification session|no session/i)).not.toBeVisible()
	})

	test('happy path — verifies code and redirects to login', async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('miks_registration_id', 'reg-test-abc')
			sessionStorage.setItem('miks_registration_email', 'jane@example.com')
		})
		await mockRoute(page, 'POST', '/auth/verify-email', 200, { ok: true })

		await page.goto('/auth/verify-email')

		const otpInputs = page.locator('input[inputmode="numeric"], input[type="text"][maxlength="1"]')
		for (let i = 0; i < 6; i++) {
			await otpInputs.nth(i).fill(String(i + 1))
		}

		await page.getByRole('button', { name: /verify/i }).click()
		await page.waitForURL(/\/auth\/login/, { timeout: 8_000 })
	})

	test('shows error on invalid code', async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('miks_registration_id', 'reg-test-abc')
			sessionStorage.setItem('miks_registration_email', 'jane@example.com')
		})
		await mockRoute(page, 'POST', '/auth/verify-email', 400, { message: 'Invalid verification code.' })

		await page.goto('/auth/verify-email')

		const otpInputs = page.locator('input[inputmode="numeric"], input[type="text"][maxlength="1"]')
		for (let i = 0; i < 6; i++) {
			await otpInputs.nth(i).fill('9')
		}

		await page.getByRole('button', { name: /verify/i }).click()
		await expect(page.getByText(/invalid|wrong|expired/i)).toBeVisible({ timeout: 5_000 })
	})

	test('shows no-session state when sessionStorage is empty', async ({ page }) => {
		await page.goto('/auth/verify-email')
		await expect(page.getByText(/no verification session|no session/i)).toBeVisible({ timeout: 5_000 })
	})
})

// ─── Forgot password ──────────────────────────────────────────────────────────

test.describe('Forgot password', () => {
	test.beforeEach(async ({ page }) => {
		await blockRefresh(page)
	})

	test('sends reset email and shows confirmation', async ({ page }) => {
		await mockRoute(page, 'POST', '/auth/forgot-password', 200, {})

		await page.goto('/auth/forgot-password')
		await page.getByLabel(/email/i).fill('jane@example.com')
		await page.getByRole('button', { name: /send|reset/i }).click()

		await expect(page.getByText(/check your inbox|email sent/i)).toBeVisible({ timeout: 5_000 })
	})
})
