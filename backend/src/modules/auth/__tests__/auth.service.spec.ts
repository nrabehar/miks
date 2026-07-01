import { ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthService } from '../auth.service.js'

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeMocks() {
	const prisma = {
		user: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		account: { updateMany: vi.fn() },
	}

	const redis = {
		get: vi.fn(),
		set: vi.fn(),
		del: vi.fn(),
	}

	const users = { findById: vi.fn() }

	const accounts = {
		hashPassword: vi.fn().mockResolvedValue({ hash: 'hashed', salt: 'salt' }),
		verifyPassword: vi.fn(),
	}

	const tokens = {
		generateEmailCode: vi.fn().mockResolvedValue('123456'),
		verifyEmailCode: vi.fn().mockResolvedValue(undefined),
		generatePasswordResetToken: vi.fn().mockResolvedValue('reset-token'),
		verifyPasswordResetToken: vi.fn().mockResolvedValue(undefined),
	}

	const email = {
		sendVerificationCode: vi.fn().mockResolvedValue(undefined),
		sendPasswordReset: vi.fn().mockResolvedValue(undefined),
	}

	const sessions = {
		createSession: vi.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
		refreshSession: vi.fn(),
		revokeSession: vi.fn().mockResolvedValue(undefined),
		revokeAllForUser: vi.fn().mockResolvedValue(undefined),
	}

	const service = new AuthService(
		prisma as any,
		redis as any,
		users as any,
		accounts as any,
		tokens as any,
		email as any,
		sessions as any,
	)

	return { service, prisma, redis, users, accounts, tokens, email, sessions }
}

// ─── register ─────────────────────────────────────────────────────────────────

describe('AuthService.register', () => {
	let mocks: ReturnType<typeof makeMocks>

	beforeEach(() => {
		mocks = makeMocks()
	})

	it('crée un utilisateur et envoie le code de vérification', async () => {
		const { service, prisma, tokens, email } = mocks

		prisma.user.findUnique.mockResolvedValue(null)
		prisma.user.create.mockResolvedValue({
			id: 'user-1',
			email: 'jane@example.com',
			firstName: 'Jane',
			lastName: 'Doe',
			emailVerified: false,
		})

		const result = await service.register({
			email: 'jane@example.com',
			firstName: 'Jane',
			lastName: 'Doe',
			password: 'Str0ng!Pass',
		})

		expect(result).toEqual({ registrationId: 'user-1', emailSent: true })
		expect(tokens.generateEmailCode).toHaveBeenCalledWith('user-1')
		expect(email.sendVerificationCode).toHaveBeenCalledWith('jane@example.com', 'Jane Doe', '123456')
	})

	it('rejette si l\'email est déjà utilisé', async () => {
		const { service, prisma } = mocks

		prisma.user.findUnique.mockResolvedValue({ id: 'existing' })

		await expect(
			service.register({ email: 'taken@example.com', firstName: 'A', lastName: 'B', password: 'Str0ng!Pass' }),
		).rejects.toThrow(ConflictException)
	})
})

// ─── login ────────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
	const BASE_USER = {
		id: 'user-1',
		email: 'jane@example.com',
		firstName: 'Jane',
		lastName: 'Doe',
		avatarUrl: null,
		phone: null,
		emailVerified: true,
		phoneVerified: false,
		twoFaEnabled: false,
		twoFaSecret: null,
		language: 'fr',
		isOnline: false,
		failedLoginAttempts: 0,
		lockedUntil: null,
		accounts: [{ providerId: 'credential', password: 'hashed', passwordSalt: 'salt' }],
	}

	let mocks: ReturnType<typeof makeMocks>

	beforeEach(() => {
		mocks = makeMocks()
	})

	it('retourne les tokens quand les credentials sont corrects', async () => {
		const { service, prisma, accounts } = mocks

		prisma.user.findUnique.mockResolvedValue(BASE_USER)
		prisma.user.update.mockResolvedValue(BASE_USER)
		accounts.verifyPassword.mockResolvedValue(true)

		const result = await service.login({ email: 'jane@example.com', password: 'Str0ng!Pass' })

		expect(result.requires2FA).toBe(false)
		expect((result as any).accessToken).toBe('at')
	})

	it('déclenche le challenge 2FA si activé', async () => {
		const { service, prisma, accounts, redis } = mocks

		prisma.user.findUnique.mockResolvedValue({ ...BASE_USER, twoFaEnabled: true })
		prisma.user.update.mockResolvedValue({})
		accounts.verifyPassword.mockResolvedValue(true)
		redis.set.mockResolvedValue(undefined)

		const result = await service.login({ email: 'jane@example.com', password: 'Str0ng!Pass' })

		expect(result.requires2FA).toBe(true)
		expect((result as any).challengeId).toBeDefined()
		expect(redis.set).toHaveBeenCalledWith(
			expect.stringContaining('2fa_pending:'),
			'user-1',
			expect.any(Number),
		)
	})

	it('rejette si l\'utilisateur n\'existe pas', async () => {
		const { service, prisma } = mocks
		prisma.user.findUnique.mockResolvedValue(null)

		await expect(
			service.login({ email: 'ghost@example.com', password: 'whatever' }),
		).rejects.toThrow(UnauthorizedException)
	})

	it('rejette si le mot de passe est incorrect', async () => {
		const { service, prisma, accounts } = mocks

		prisma.user.findUnique.mockResolvedValue(BASE_USER)
		prisma.user.update.mockResolvedValue({})
		accounts.verifyPassword.mockResolvedValue(false)

		await expect(
			service.login({ email: 'jane@example.com', password: 'wrong' }),
		).rejects.toThrow(UnauthorizedException)
	})

	it('incrémente failedLoginAttempts après un mauvais mot de passe', async () => {
		const { service, prisma, accounts } = mocks

		prisma.user.findUnique.mockResolvedValue({ ...BASE_USER, failedLoginAttempts: 2 })
		prisma.user.update.mockResolvedValue({})
		accounts.verifyPassword.mockResolvedValue(false)

		await expect(service.login({ email: 'jane@example.com', password: 'wrong' })).rejects.toThrow()

		expect(prisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 3 }) }),
		)
	})

	it('verrouille le compte après 5 tentatives échouées', async () => {
		const { service, prisma, accounts } = mocks

		prisma.user.findUnique.mockResolvedValue({ ...BASE_USER, failedLoginAttempts: 4 })
		prisma.user.update.mockResolvedValue({})
		accounts.verifyPassword.mockResolvedValue(false)

		await expect(service.login({ email: 'jane@example.com', password: 'wrong' })).rejects.toThrow()

		expect(prisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ lockedUntil: expect.any(Date), failedLoginAttempts: 0 }),
			}),
		)
	})

	it('rejette si le compte est verrouillé', async () => {
		const { service, prisma } = mocks

		prisma.user.findUnique.mockResolvedValue({
			...BASE_USER,
			lockedUntil: new Date(Date.now() + 60_000),
		})

		await expect(
			service.login({ email: 'jane@example.com', password: 'Str0ng!Pass' }),
		).rejects.toThrow(ForbiddenException)
	})

	it('rejette si l\'email n\'est pas vérifié', async () => {
		const { service, prisma, accounts } = mocks

		prisma.user.findUnique.mockResolvedValue({ ...BASE_USER, emailVerified: false })
		prisma.user.update.mockResolvedValue({})
		accounts.verifyPassword.mockResolvedValue(true)

		await expect(
			service.login({ email: 'jane@example.com', password: 'Str0ng!Pass' }),
		).rejects.toThrow(ForbiddenException)
	})
})

// ─── verifyEmail ──────────────────────────────────────────────────────────────

describe('AuthService.verifyEmail', () => {
	it('marque l\'email comme vérifié', async () => {
		const { service, prisma, tokens } = makeMocks()

		prisma.user.update.mockResolvedValue({ emailVerified: true })
		tokens.verifyEmailCode.mockResolvedValue(undefined)

		const result = await service.verifyEmail('user-1', '123456')

		expect(result).toEqual({ verified: true })
		expect(tokens.verifyEmailCode).toHaveBeenCalledWith('user-1', '123456')
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: 'user-1' },
			data: { emailVerified: true },
		})
	})

	it('propage l\'erreur si le code est invalide', async () => {
		const { service, tokens } = makeMocks()
		tokens.verifyEmailCode.mockRejectedValue(new UnauthorizedException('Invalid code'))

		await expect(service.verifyEmail('user-1', '000000')).rejects.toThrow(UnauthorizedException)
	})
})

// ─── resendEmailCode ──────────────────────────────────────────────────────────

describe('AuthService.resendEmailCode', () => {
	it('renvoie un nouveau code si l\'email n\'est pas encore vérifié', async () => {
		const { service, users, tokens, email } = makeMocks()

		users.findById.mockResolvedValue({
			id: 'user-1',
			email: 'jane@example.com',
			firstName: 'Jane',
			lastName: null,
			emailVerified: false,
		})

		const result = await service.resendEmailCode('user-1')

		expect(result).toEqual({ message: 'Code resent' })
		expect(email.sendVerificationCode).toHaveBeenCalledWith('jane@example.com', 'Jane', '123456')
	})

	it('rejette si l\'utilisateur n\'existe pas', async () => {
		const { service, users } = makeMocks()
		users.findById.mockResolvedValue(null)

		await expect(service.resendEmailCode('ghost')).rejects.toThrow(NotFoundException)
	})
})

// ─── forgotPassword ───────────────────────────────────────────────────────────

describe('AuthService.forgotPassword', () => {
	it('envoie l\'email de reset si l\'utilisateur existe', async () => {
		const { service, prisma, email } = makeMocks()

		prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firstName: 'Jane', lastName: 'Doe' })

		const result = await service.forgotPassword('jane@example.com')

		expect(result.message).toBeDefined()
		expect(email.sendPasswordReset).toHaveBeenCalledWith(
			'jane@example.com', 'Jane Doe', 'user-1', 'reset-token',
		)
	})

	it('retourne le même message si l\'email est inconnu (pas de fuite)', async () => {
		const { service, prisma, email } = makeMocks()

		prisma.user.findUnique.mockResolvedValue(null)

		const result = await service.forgotPassword('ghost@example.com')

		expect(result.message).toBeDefined()
		expect(email.sendPasswordReset).not.toHaveBeenCalled()
	})
})

// ─── resetPassword ────────────────────────────────────────────────────────────

describe('AuthService.resetPassword', () => {
	it('met à jour le mot de passe et révoque toutes les sessions', async () => {
		const { service, prisma, sessions, tokens } = makeMocks()

		tokens.verifyPasswordResetToken.mockResolvedValue(undefined)
		prisma.account.updateMany.mockResolvedValue({ count: 1 })

		const result = await service.resetPassword('user-1', '123456', 'NewStr0ng!Pass')

		expect(result.message).toBeDefined()
		expect(prisma.account.updateMany).toHaveBeenCalledWith({
			where: { userId: 'user-1', providerId: 'credential' },
			data: { password: 'hashed', passwordSalt: 'salt' },
		})
		expect(sessions.revokeAllForUser).toHaveBeenCalledWith('user-1')
	})
})
