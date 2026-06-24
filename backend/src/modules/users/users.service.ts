import { RedisService } from '#/core/redis/redis.service';
import { PrismaService } from '#/core/prisma/prisma.service';
import { User } from '#/generated/prisma';
import {
	ConflictException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';

const USER_CACHE_TTL_MS = 60_000; // 60s — login metadata is short-lived enough

@Injectable()
export class UsersService {
	private readonly logger = new Logger(UsersService.name);

	constructor(
		private prisma: PrismaService,
		private redis: RedisService,
	) {}

	private userCacheKey(idOrIdentifier: string): string {
		return `user:by:${idOrIdentifier.toLowerCase()}`;
	}

	private async cacheUser(user: User): Promise<void> {
		if (!user?.id) return;
		try {
			await this.redis.set(
				this.userCacheKey(user.id),
				JSON.stringify(user),
				USER_CACHE_TTL_MS,
			);
			if (user.email) {
				await this.redis.set(
					this.userCacheKey(user.email),
					JSON.stringify(user),
					USER_CACHE_TTL_MS,
				);
			}
			if (user.username) {
				await this.redis.set(
					this.userCacheKey(user.username),
					JSON.stringify(user),
					USER_CACHE_TTL_MS,
				);
			}
		} catch (err) {
			// Cache miss is fine
			this.logger.debug(
				`Failed to cache user ${user.id}: ${(err as Error).message}`,
			);
		}
	}

	private async readCachedUser(
		lookup: string,
	): Promise<User | null | undefined> {
		try {
			const raw = await this.redis.get<string>(this.userCacheKey(lookup));
			if (!raw) return undefined;
			return JSON.parse(raw) as User;
		} catch {
			return undefined;
		}
	}

	async invalidateUserCache(user: User): Promise<void> {
		try {
			await Promise.all(
				[user.id, user.email, user.username]
					.filter(Boolean)
					.map((k) =>
						this.redis.del(this.userCacheKey(k as string)),
					),
			);
		} catch {
			// Non-fatal
		}
	}

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

	async findById(id: string): Promise<User | null> {
		const cached = await this.readCachedUser(id);
		if (cached !== undefined) return cached;

		const user = await this.prisma.user.findUnique({ where: { id } });
		if (user) await this.cacheUser(user);
		return user;
	}

	async findByIdentifier(identifier: string): Promise<User | null> {
		const lookup = identifier.trim().toLowerCase();
		const cached = await this.readCachedUser(lookup);
		if (cached !== undefined) return cached;

		const user = await this.prisma.user.findFirst({
			where: {
				OR: [
					{ email: { equals: lookup, mode: 'insensitive' } },
					{ username: { equals: lookup, mode: 'insensitive' } },
				],
			},
		});
		if (user) await this.cacheUser(user);
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
		await this.invalidateUserCache(updated);
		return updated;
	}

	async markLogin(id: string): Promise<void> {
		const now = new Date();
		try {
			const updated = await this.prisma.user.update({
				where: { id },
				data: {
					lastLoginAt: now,
					lastActiveAt: now,
					isOnline: true,
					failedLoginAttempts: 0,
					lockedUntil: null,
				},
			});
			await this.invalidateUserCache(updated);
			// Reset Redis counters as well
			try {
				await this.redis.del(`login:fail:${id}`);
			} catch {
				/* non-fatal */
			}
		} catch (error) {
			// Non-fatal: logging in should never fail because we couldn't update
			// these bookkeeping fields.
			this.logger.warn(
				`Failed to update login metadata for user ${id}: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Increment the failed login counter (Redis primary, DB best-effort sync)
	 * and lock the account if it crosses the threshold.
	 */
	async registerFailedLogin(
		id: string,
	): Promise<{ attempts: number; lockedUntil: Date | null }> {
		const MAX_ATTEMPTS = 5;
		const LOCKOUT_MS = 15 * 60 * 1000;

		let attempts = 0;
		let lockedUntil: Date | null = null;

		try {
			// Sliding TTL: refresh expire on each failure so the window
			// starts from the LAST failure rather than the first.
			const key = `login:fail:${id}`;
			const current = await this.redis.get<string>(key);
			attempts = current ? Number(current) + 1 : 1;
			await this.redis.set(key, String(attempts), LOCKOUT_MS);
			if (attempts >= MAX_ATTEMPTS) {
				lockedUntil = new Date(Date.now() + LOCKOUT_MS);
				await this.redis.set(
					`login:locked:${id}`,
					lockedUntil.toISOString(),
					LOCKOUT_MS,
				);
			}
		} catch (err) {
			// Fallback to DB-only if Redis is down
			this.logger.warn(
				`Redis failed for registerFailedLogin, falling back to DB: ${(err as Error).message}`,
			);
			const user = await this.prisma.user.findUnique({ where: { id } });
			if (!user) throw new NotFoundException('User not found');
			attempts = (user.failedLoginAttempts ?? 0) + 1;
			lockedUntil =
				attempts >= MAX_ATTEMPTS
					? new Date(Date.now() + LOCKOUT_MS)
					: null;
		}

		// Best-effort DB sync — DB remains the source of truth for audit/recovery
		try {
			await this.prisma.user.update({
				where: { id },
				data: { failedLoginAttempts: attempts, lockedUntil },
			});
		} catch (err) {
			this.logger.warn(
				`Failed to sync failedLoginAttempts to DB for ${id}: ${(err as Error).message}`,
			);
		}

		// Invalidate user cache so the new counter is reflected next time
		try {
			await this.redis.del(`user:by:${id}`);
		} catch {
			/* non-fatal */
		}

		return { attempts, lockedUntil };
	}

	/**
	 * Check whether the user is currently locked out. Uses Redis as primary
	 * check with DB fallback.
	 */
	async isLockedOut(
		id: string,
	): Promise<{ locked: boolean; lockedUntil: Date | null }> {
		try {
			const iso = await this.redis.get<string>(`login:locked:${id}`);
			if (iso) {
				const until = new Date(iso);
				if (until > new Date()) return { locked: true, lockedUntil: until };
			}
		} catch {
			// fall through to DB
		}
		try {
			const user = await this.prisma.user.findUnique({
				where: { id },
				select: { lockedUntil: true },
			});
			if (user?.lockedUntil && user.lockedUntil > new Date()) {
				return { locked: true, lockedUntil: user.lockedUntil };
			}
		} catch {
			/* ignore */
		}
		return { locked: false, lockedUntil: null };
	}
}
