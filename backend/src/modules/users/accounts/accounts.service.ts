import { PrismaService } from '#/core/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

@Injectable()
export class AccountsService {
	private readonly logger = new Logger(AccountsService.name);

	constructor(private readonly prisma: PrismaService) {}

	async createCredentials(userId: string, password: string) {
		const { hash, salt } = await this.hashPassword(password);

		const account = await this.prisma.account.create({
			data: {
				userId,
				password: hash,
				passwordSalt: salt,
				accountId: userId,
				providerId: 'credentials',
			},
			select: { providerId: true, accountId: true, createdAt: true },
		});

		this.logger.log(`Credentials created for user: ${userId}`);

		return account;
	}

	async validateCredentials(
		userId: string,
		password: string,
	): Promise<boolean> {
		const account = await this.prisma.account.findFirst({
			where: {
				userId,
				providerId: 'credentials',
			},
		});

		if (!account || !account.password || !account.passwordSalt) {
			return false;
		}

		const isvalid = await this.verifyPassword(
			account.password,
			password + account.passwordSalt,
		);

		return isvalid;
	}

	async findAll(userId: string) {
		return this.prisma.account.findMany({
			where: { userId },
			select: { providerId: true, accountId: true, createdAt: true },
		});
	}

	async findByProvider(userId: string, providerId: string) {
		return this.prisma.account.findFirst({
			where: { userId, providerId },
			select: { providerId: true, accountId: true, createdAt: true },
		});
	}

	async updatePassword(userId: string, newPassword: string) {
		const { hash, salt } = await this.hashPassword(newPassword);

		await this.prisma.account.update({
			where: {
				providerId_accountId: { providerId: 'credentials', accountId: userId },
			},
			data: { password: hash, passwordSalt: salt },
		});

		this.logger.log(`Password updated for user: ${userId}`);
	}

	async upsertOAuthAccount(
		userId: string,
		providerId: string,
		accountId: string,
		accessToken: string,
		refreshToken?: string,
	) {
		return this.prisma.account.upsert({
			where: {
				providerId_accountId: {
					providerId,
					accountId,
				},
			},
			update: {
				accessToken,
				refreshToken,
				accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
			},
			create: {
				userId,
				providerId,
				accountId,
				accessToken,
				refreshToken,
				accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
			},
		});
	}

	private async hashPassword(
		password: string,
	): Promise<{ hash: string; salt: string }> {
		const salt = randomBytes(16).toString('hex');
		const hash = await argon2.hash(password + salt, {
			type: argon2.argon2id,
			memoryCost: 7168,
			timeCost: 5,
			parallelism: 1,
		});
		return { hash, salt };
	}

	private async verifyPassword(
		hash: string,
		password: string,
	): Promise<boolean> {
		return argon2.verify(hash, password);
	}
}
