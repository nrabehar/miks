import { PrismaService } from '#/core/prisma/prisma.service';
import { User } from '#/generated/prisma';
import {
	ConflictException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';

@Injectable()
export class UsersService {
	private readonly logger = new Logger(UsersService.name);

	constructor(private prisma: PrismaService) {}

	async create(email: string, firstName: string, lastName: string) {
		const existingUser = await this.prisma.user.findFirst({
			where: { email },
		});

		if (existingUser) {
			if (existingUser.email === email) {
				throw new ConflictException(
					'Email already exists, login instead',
				);
			}
		}

		const newUser = await this.prisma.user.create({
			data: {
				email,
				firstName,
				lastName,
				username: email.replace(/@.*/, ''),
			},
		});

		this.logger.log(`User created: ${newUser.id}`);

		return newUser;
	}

	async findAll() {
		return this.prisma.user.findMany();
	}

	async findById(id: string) {
		const user = await this.prisma.user.findUnique({
			where: {
				id,
			},
		});
		return user;
	}

	async findByIdentifier(identifier: string) {
		const user = await this.prisma.user.findFirst({
			where: {
				OR: [{ email: identifier }, { username: identifier }],
			},
		});
		return user;
	}

	async update(id: string, data: Partial<User>): Promise<User> {
		const existing = await this.prisma.user.findUnique({ where: { id } });
		if (!existing) {
			throw new NotFoundException('User not found');
		}
		const updated = await this.prisma.user.update({
			where: { id },
			data,
		});
		return updated;
	}

	async markLogin(id: string): Promise<void> {
		const now = new Date();
		try {
			await this.prisma.user.update({
				where: { id },
				data: {
					lastLoginAt: now,
					lastActiveAt: now,
					isOnline: true,
					failedLoginAttempts: 0,
					lockedUntil: null,
				},
			});
		} catch (error) {
			// Non-fatal: logging in should never fail because we couldn't update
			// these bookkeeping fields.
			this.logger.warn(
				`Failed to update login metadata for user ${id}: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Increment the failed login counter and lock the account if it crosses
	 * the threshold. Returns the new counter value and lockout end date.
	 */
	async registerFailedLogin(
		id: string,
	): Promise<{ attempts: number; lockedUntil: Date | null }> {
		const MAX_ATTEMPTS = 5;
		const LOCKOUT_MS = 15 * 60 * 1000;

		const user = await this.prisma.user.findUnique({ where: { id } });
		if (!user) throw new NotFoundException('User not found');

		const next = (user.failedLoginAttempts ?? 0) + 1;
		const lockedUntil =
			next >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;

		await this.prisma.user.update({
			where: { id },
			data: { failedLoginAttempts: next, lockedUntil },
		});

		return { attempts: next, lockedUntil };
	}
}
