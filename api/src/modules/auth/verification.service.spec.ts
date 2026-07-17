import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import { NotificationDeliveryService } from '$lib/notification-delivery/notification-delivery.service';
import { PasswordService } from '$lib/password/password.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { VerificationService } from './verification.service';

function makePrisma() {
	return {
		userIdentity: {
			findUnique: jest.fn(),
			update: jest.fn(),
		},
		verificationToken: {
			create: jest.fn(),
			updateMany: jest.fn(),
			findFirst: jest.fn(),
			update: jest.fn(),
		},
	} as unknown as PrismaService & {
		userIdentity: { findUnique: jest.Mock; update: jest.Mock };
		verificationToken: {
			create: jest.Mock;
			updateMany: jest.Mock;
			findFirst: jest.Mock;
			update: jest.Mock;
		};
	};
}

function makeConfig(expiryMinutes = 15): ConfigService {
	return {
		auth: { verificationTokenExpiryMinutes: expiryMinutes },
	} as unknown as ConfigService;
}

function hashOf(code: string): string {
	return createHash('sha256').update(code).digest('hex');
}

describe('VerificationService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let password: { hash: jest.Mock; verify: jest.Mock };
	let notifications: { sendCode: jest.Mock };
	let config: ConfigService;
	let service: VerificationService;

	beforeEach(() => {
		prisma = makePrisma();
		password = { hash: jest.fn(), verify: jest.fn() };
		notifications = { sendCode: jest.fn() };
		config = makeConfig();

		service = new VerificationService(
			prisma,
			password as unknown as PasswordService,
			notifications as unknown as NotificationDeliveryService,
			config,
		);
	});

	describe('consumeToken (via verify) — AC-10', () => {
		it('throws BadRequestException for an unknown code', async () => {
			prisma.verificationToken.findFirst.mockResolvedValue(null);

			await expect(service.verify('000000')).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect(prisma.verificationToken.update).not.toHaveBeenCalled();
		});

		it('throws ConflictException when the token was already consumed', async () => {
			prisma.verificationToken.findFirst.mockResolvedValue({
				id: 'token-1',
				identityId: 'identity-1',
				consumedAt: new Date(),
				expiresAt: new Date(Date.now() + 60_000),
			});

			await expect(service.verify('123456')).rejects.toBeInstanceOf(
				ConflictException,
			);
			expect(prisma.verificationToken.update).not.toHaveBeenCalled();
		});

		it('throws BadRequestException when the token has expired — covers AC-10', async () => {
			prisma.verificationToken.findFirst.mockResolvedValue({
				id: 'token-1',
				identityId: 'identity-1',
				consumedAt: null,
				expiresAt: new Date(Date.now() - 1_000),
			});

			await expect(service.verify('123456')).rejects.toMatchObject({
				message: 'This token has expired',
			});
			expect(prisma.verificationToken.update).not.toHaveBeenCalled();
		});

		it('consumes a valid, unexpired token and marks the identity emailVerified — covers AC-10', async () => {
			prisma.verificationToken.findFirst.mockResolvedValue({
				id: 'token-1',
				identityId: 'identity-1',
				consumedAt: null,
				expiresAt: new Date(Date.now() + 60_000),
			});

			await service.verify('123456');

			expect(prisma.verificationToken.update).toHaveBeenCalledWith({
				where: { id: 'token-1' },
				data: { consumedAt: expect.any(Date) },
			});
			expect(prisma.userIdentity.update).toHaveBeenCalledWith({
				where: { id: 'identity-1' },
				data: { emailVerified: true },
			});
		});

		it('hashes the raw code before lookup, never queries with the raw value', async () => {
			prisma.verificationToken.findFirst.mockResolvedValue(null);

			await expect(service.verify('654321')).rejects.toBeInstanceOf(
				BadRequestException,
			);

			expect(prisma.verificationToken.findFirst).toHaveBeenCalledWith({
				where: {
					tokenHash: hashOf('654321'),
					purposeCode: 'EMAIL_VERIFICATION',
				},
				orderBy: { createdAt: 'desc' },
			});
		});
	});

	describe('requestVerification — AC-8, AC-10', () => {
		it('does nothing for an unknown identifier (no leak)', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue(null);

			await service.requestVerification('nobody@example.test');

			expect(prisma.verificationToken.create).not.toHaveBeenCalled();
			expect(notifications.sendCode).not.toHaveBeenCalled();
		});

		it('does nothing when the identity is already verified', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue({
				id: 'identity-1',
				userId: 'user-1',
				emailVerified: true,
			});

			await service.requestVerification('ada@example.test');

			expect(prisma.verificationToken.create).not.toHaveBeenCalled();
			expect(notifications.sendCode).not.toHaveBeenCalled();
		});

		it('invalidates any pending token before creating a new one, then sends the code', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue({
				id: 'identity-1',
				userId: 'user-1',
				emailVerified: false,
			});

			await service.requestVerification('ada@example.test');

			expect(prisma.verificationToken.updateMany).toHaveBeenCalledWith({
				where: {
					userId: 'user-1',
					purposeCode: 'EMAIL_VERIFICATION',
					identityId: 'identity-1',
					consumedAt: null,
				},
				data: { consumedAt: expect.any(Date) },
			});
			expect(prisma.verificationToken.create).toHaveBeenCalledTimes(1);
			expect(notifications.sendCode).toHaveBeenCalledWith(
				'ada@example.test',
				expect.any(String),
				expect.stringMatching(/\d{6}/),
			);

			const createCall = prisma.verificationToken.create.mock.calls[0][0];
			expect(createCall.data.purposeCode).toBe('EMAIL_VERIFICATION');
			expect(createCall.data.tokenHash).toHaveLength(64);
		});

		it('sets expiresAt using the configured expiry window', async () => {
			config = makeConfig(1);
			service = new VerificationService(
				prisma,
				password as unknown as PasswordService,
				notifications as unknown as NotificationDeliveryService,
				config,
			);
			prisma.userIdentity.findUnique.mockResolvedValue({
				id: 'identity-1',
				userId: 'user-1',
				emailVerified: false,
			});

			const before = Date.now();
			await service.requestVerification('ada@example.test');
			const after = Date.now();

			const createCall = prisma.verificationToken.create.mock.calls[0][0];
			const expiresAt = createCall.data.expiresAt.getTime();
			expect(expiresAt).toBeGreaterThanOrEqual(before + 60_000);
			expect(expiresAt).toBeLessThanOrEqual(after + 60_000 + 1_000);
		});
	});

	describe('requestPasswordReset — AC-4, AC-8', () => {
		it('does nothing for an unknown identifier (no leak)', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue(null);

			await service.requestPasswordReset('nobody@example.test');

			expect(prisma.verificationToken.create).not.toHaveBeenCalled();
			expect(notifications.sendCode).not.toHaveBeenCalled();
		});

		it('invalidates pending resets, creates a new one, and sends the code', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue({
				id: 'identity-1',
				userId: 'user-1',
			});

			await service.requestPasswordReset('ada@example.test');

			expect(prisma.verificationToken.updateMany).toHaveBeenCalledWith({
				where: {
					userId: 'user-1',
					purposeCode: 'PASSWORD_RESET',
					identityId: 'identity-1',
					consumedAt: null,
				},
				data: { consumedAt: expect.any(Date) },
			});
			expect(notifications.sendCode).toHaveBeenCalledWith(
				'ada@example.test',
				expect.any(String),
				expect.stringMatching(/\d{6}/),
			);
		});
	});

	describe('resetPassword — AC-4, AC-10', () => {
		it('rejects a token with no identityId (defensive: not a reset-purpose token)', async () => {
			prisma.verificationToken.findFirst.mockResolvedValue({
				id: 'token-1',
				identityId: null,
				consumedAt: null,
				expiresAt: new Date(Date.now() + 60_000),
			});

			await expect(
				service.resetPassword('123456', 'NewStr0ngP@ss!'),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(password.hash).not.toHaveBeenCalled();
		});

		it('throws BadRequestException for an expired reset token — covers AC-10', async () => {
			prisma.verificationToken.findFirst.mockResolvedValue({
				id: 'token-1',
				identityId: 'identity-1',
				consumedAt: null,
				expiresAt: new Date(Date.now() - 1_000),
			});

			await expect(
				service.resetPassword('123456', 'NewStr0ngP@ss!'),
			).rejects.toMatchObject({ message: 'This token has expired' });
			expect(password.hash).not.toHaveBeenCalled();
		});

		it('throws ConflictException when the reset token was already consumed — covers AC-10', async () => {
			prisma.verificationToken.findFirst.mockResolvedValue({
				id: 'token-1',
				identityId: 'identity-1',
				consumedAt: new Date(),
				expiresAt: new Date(Date.now() + 60_000),
			});

			await expect(
				service.resetPassword('123456', 'NewStr0ngP@ss!'),
			).rejects.toBeInstanceOf(ConflictException);
		});

		it('hashes the new password and clears lockout state on a valid token — covers AC-4', async () => {
			prisma.verificationToken.findFirst.mockResolvedValue({
				id: 'token-1',
				identityId: 'identity-1',
				consumedAt: null,
				expiresAt: new Date(Date.now() + 60_000),
			});
			password.hash.mockResolvedValue('new-hashed-secret');

			await service.resetPassword('123456', 'NewStr0ngP@ss!');

			expect(password.hash).toHaveBeenCalledWith('NewStr0ngP@ss!');
			expect(prisma.userIdentity.update).toHaveBeenCalledWith({
				where: { id: 'identity-1' },
				data: {
					secretHash: 'new-hashed-secret',
					failedAttempts: 0,
					lockedUntil: null,
				},
			});
		});
	});
});
