import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import { NotificationDeliveryService } from '$lib/notification-delivery/notification-delivery.service';
import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { Device } from '$prisma/client';
import { parseDeviceInfo } from './device-info.util';

export interface DeviceMeta {
	userAgent?: string;
	ip?: string;
}

export interface DeviceResolution {
	device: Device;
	requiresConfirmation: boolean;
	confirmationId?: string;
}

@Injectable()
export class DeviceService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly notifications: NotificationDeliveryService,
		private readonly config: ConfigService,
	) {}

	/**
	 * The device that completes /auth/register is trusted immediately (AC-19):
	 * created directly ACTIVE, no confirmation step.
	 */
	async identifyForRegister(
		userId: string,
		deviceId: string,
		meta: DeviceMeta,
	): Promise<Device> {
		const info = parseDeviceInfo(meta.userAgent);

		return this.prisma.device.upsert({
			where: { userId_deviceId: { userId, deviceId } },
			create: {
				userId,
				deviceId,
				type: info.type,
				platform: info.platform,
				deviceName: info.deviceName,
				status: 'ACTIVE',
			},
			update: {
				status: 'ACTIVE',
				lastActiveAt: new Date(),
				type: info.type,
				platform: info.platform,
				deviceName: info.deviceName,
			},
		});
	}

	/**
	 * Login/OAuth callback path (AC-13, AC-14, AC-15): a known active device
	 * updates in place and is trusted; anything else (never seen, or
	 * revoked) is put back to PENDING and a confirmation code is emailed.
	 */
	async identifyForLogin(
		userId: string,
		deviceId: string,
		meta: DeviceMeta,
	): Promise<DeviceResolution> {
		const info = parseDeviceInfo(meta.userAgent);
		const existing = await this.findOrCreatePending(userId, deviceId, info);

		if (existing.status === 'ACTIVE') {
			const device = await this.prisma.device.update({
				where: { id: existing.id },
				data: {
					lastActiveAt: new Date(),
					type: info.type,
					platform: info.platform,
					deviceName: info.deviceName,
				},
			});

			return { device, requiresConfirmation: false };
		}

		let device = existing;

		if (device.status === 'REVOKED') {
			device = await this.prisma.device.update({
				where: { id: device.id },
				data: { status: 'PENDING' },
			});
		}

		const confirmationId = await this.sendConfirmationCode(device);

		return { device, requiresConfirmation: true, confirmationId };
	}

	async confirm(confirmationId: string, code: string): Promise<Device> {
		const record = await this.prisma.verificationToken.findUnique({
			where: { id: confirmationId },
		});

		if (!record || record.purposeCode !== 'NEW_DEVICE_CONFIRMATION') {
			throw new NotFoundException('Unknown confirmation');
		}

		if (record.consumedAt) {
			throw new ConflictException(
				'This confirmation code has already been used',
			);
		}

		if (record.expiresAt < new Date()) {
			throw new BadRequestException('This confirmation code has expired');
		}

		if (record.tokenHash !== this.hashCode(code)) {
			throw new BadRequestException('Incorrect confirmation code');
		}

		await this.prisma.verificationToken.update({
			where: { id: record.id },
			data: { consumedAt: new Date() },
		});

		return this.prisma.device.update({
			where: { id: record.deviceId! },
			data: { status: 'ACTIVE', lastActiveAt: new Date() },
		});
	}

	async resendConfirmation(confirmationId: string): Promise<void> {
		const record = await this.prisma.verificationToken.findUnique({
			where: { id: confirmationId },
		});

		if (
			!record ||
			record.purposeCode !== 'NEW_DEVICE_CONFIRMATION' ||
			!record.deviceId
		) {
			throw new NotFoundException('Unknown confirmation');
		}

		const device = await this.prisma.device.findUnique({
			where: { id: record.deviceId },
		});

		if (!device || device.status !== 'PENDING') {
			throw new NotFoundException('Unknown confirmation');
		}

		await this.sendConfirmationCode(device);
	}

	/**
	 * Explicit session revocation (DELETE /auth/sessions/:id, or refresh
	 * token reuse detection) demotes the device to REVOKED. An ordinary
	 * logout must NOT call this (AC-18): it only ends the Session.
	 */
	async revokeByDeviceId(deviceId: string | null): Promise<void> {
		if (!deviceId) {
			return;
		}

		await this.prisma.device.update({
			where: { id: deviceId },
			data: { status: 'REVOKED' },
		});
	}

	async touch(deviceId: string | null): Promise<void> {
		if (!deviceId) {
			return;
		}

		await this.prisma.device
			.update({
				where: { id: deviceId },
				data: { lastActiveAt: new Date() },
			})
			.catch(() => undefined);
	}

	private async findOrCreatePending(
		userId: string,
		deviceId: string,
		info: ReturnType<typeof parseDeviceInfo>,
	): Promise<Device> {
		const existing = await this.prisma.device.findUnique({
			where: { userId_deviceId: { userId, deviceId } },
		});

		if (existing) {
			return existing;
		}

		try {
			return await this.prisma.device.create({
				data: {
					userId,
					deviceId,
					type: info.type,
					platform: info.platform,
					deviceName: info.deviceName,
					status: 'PENDING',
				},
			});
		} catch {
			// Two concurrent first-time requests from the same new device:
			// the loser of the unique (userId, deviceId) race re-fetches.
			return this.prisma.device.findUniqueOrThrow({
				where: { userId_deviceId: { userId, deviceId } },
			});
		}
	}

	private async sendConfirmationCode(device: Device): Promise<string> {
		await this.prisma.verificationToken.updateMany({
			where: {
				deviceId: device.id,
				purposeCode: 'NEW_DEVICE_CONFIRMATION',
				consumedAt: null,
			},
			data: { consumedAt: new Date() },
		});

		const code = this.generateCode();

		const token = await this.prisma.verificationToken.create({
			data: {
				userId: device.userId,
				purposeCode: 'NEW_DEVICE_CONFIRMATION',
				deviceId: device.id,
				tokenHash: this.hashCode(code),
				expiresAt: new Date(
					Date.now() +
						this.config.auth.deviceConfirmationCodeExpiryMinutes *
							60 *
							1000,
				),
			},
		});

		const user = await this.prisma.user.findUnique({
			where: { id: device.userId },
		});

		if (user?.email) {
			await this.notifications.sendCode(
				user.email,
				'Confirm this new device',
				`A login from a new device was detected. Your confirmation code is ${code}`,
			);
		}

		return token.id;
	}

	private generateCode(): string {
		return randomInt(0, 1_000_000).toString().padStart(6, '0');
	}

	private hashCode(code: string): string {
		return createHash('sha256').update(code).digest('hex');
	}
}
