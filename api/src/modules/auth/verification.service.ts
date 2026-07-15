import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import {
	isEmailIdentifier,
	NotificationDeliveryService,
} from '$lib/notification-delivery/notification-delivery.service';
import { PasswordService } from '$lib/password/password.service';
import {
	BadRequestException,
	ConflictException,
	Injectable,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';

@Injectable()
export class VerificationService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly password: PasswordService,
		private readonly notifications: NotificationDeliveryService,
		private readonly config: ConfigService,
	) {}

	async requestPasswordReset(identifier: string): Promise<void> {
		const identity = await this.findLocalIdentity(identifier);

		if (!identity) {
			return;
		}

		await this.invalidatePending(
			identity.userId,
			'PASSWORD_RESET',
			identity.id,
		);
		const code = this.generateCode();

		await this.prisma.verificationToken.create({
			data: {
				userId: identity.userId,
				purposeCode: 'PASSWORD_RESET',
				identityId: identity.id,
				sentTo: identifier,
				tokenHash: this.hashCode(code),
				expiresAt: this.expiryDate(),
			},
		});

		await this.notifications.sendCode(
			identifier,
			'Reset your MIKS password',
			`Your password reset code is ${code}`,
		);
	}

	async resetPassword(token: string, newPassword: string): Promise<void> {
		const record = await this.consumeToken(token, 'PASSWORD_RESET');

		if (!record.identityId) {
			throw new BadRequestException('Invalid reset token');
		}

		const secretHash = await this.password.hash(newPassword);

		await this.prisma.userIdentity.update({
			where: { id: record.identityId },
			data: { secretHash, failedAttempts: 0, lockedUntil: null },
		});
	}

	async requestVerification(identifier: string): Promise<void> {
		const identity = await this.findLocalIdentity(identifier);

		if (!identity || identity.emailVerified) {
			return;
		}

		const purpose = isEmailIdentifier(identifier)
			? 'EMAIL_VERIFICATION'
			: 'PHONE_VERIFICATION';

		await this.invalidatePending(identity.userId, purpose, identity.id);
		const code = this.generateCode();

		await this.prisma.verificationToken.create({
			data: {
				userId: identity.userId,
				purposeCode: purpose,
				identityId: identity.id,
				sentTo: identifier,
				tokenHash: this.hashCode(code),
				expiresAt: this.expiryDate(),
			},
		});

		await this.notifications.sendCode(
			identifier,
			'Verify your MIKS account',
			`Your verification code is ${code}`,
		);
	}

	async verify(token: string): Promise<void> {
		const record = await this.consumeToken(token, [
			'EMAIL_VERIFICATION',
			'PHONE_VERIFICATION',
		]);

		if (record.identityId) {
			await this.prisma.userIdentity.update({
				where: { id: record.identityId },
				data: { emailVerified: true },
			});
		}
	}

	private findLocalIdentity(identifier: string) {
		return this.prisma.userIdentity.findUnique({
			where: {
				providerCode_identifier: {
					providerCode: 'local',
					identifier,
				},
			},
		});
	}

	private async invalidatePending(
		userId: string,
		purposeCode: string,
		identityId: string,
	): Promise<void> {
		await this.prisma.verificationToken.updateMany({
			where: { userId, purposeCode, identityId, consumedAt: null },
			data: { consumedAt: new Date() },
		});
	}

	private async consumeToken(token: string, purposeCode: string | string[]) {
		const tokenHash = this.hashCode(token);
		const record = await this.prisma.verificationToken.findFirst({
			where: {
				tokenHash,
				purposeCode: Array.isArray(purposeCode)
					? { in: purposeCode }
					: purposeCode,
			},
			orderBy: { createdAt: 'desc' },
		});

		if (!record) {
			throw new BadRequestException('Invalid or unknown token');
		}

		if (record.consumedAt) {
			throw new ConflictException('This token has already been used');
		}

		if (record.expiresAt < new Date()) {
			throw new BadRequestException('This token has expired');
		}

		await this.prisma.verificationToken.update({
			where: { id: record.id },
			data: { consumedAt: new Date() },
		});

		return record;
	}

	private generateCode(): string {
		return randomInt(0, 1_000_000).toString().padStart(6, '0');
	}

	private hashCode(code: string): string {
		return createHash('sha256').update(code).digest('hex');
	}

	private expiryDate(): Date {
		return new Date(
			Date.now() +
				this.config.auth.verificationTokenExpiryMinutes * 60 * 1000,
		);
	}
}
