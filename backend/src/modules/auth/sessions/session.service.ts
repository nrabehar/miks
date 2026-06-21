import { PrismaService } from '#/core/prisma/prisma.service';
import { Session, User } from '#/generated/prisma';
import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UAParser } from 'ua-parser-js';
import { SessionBlacklistService } from './session-blacklist.service';

export interface SessionInfo {
	id: string;
	jti: string;
	familyId: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	device: string | null;
	os: string | null;
	browser: string | null;
	location: string | null;
	createdAt: Date;
	expiresAt: Date;
	lastUsedAt: Date | null;
	current: boolean;
}

export type SessionWithUser = Session & { user: User };

export interface CreateSessionInput {
	userId: string;
	jti: string;
	refreshToken: string;
	familyId?: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	location?: string | null;
	expiresAt: Date;
}

export interface RotateRefreshInput {
	oldJti: string;
	userId: string;
	newJti: string;
	newRefreshToken: string;
	familyId: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	location?: string | null;
	refreshExpiresAt: Date;
}

@Injectable()
export class SessionService {
	private readonly logger = new Logger(SessionService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly blacklist: SessionBlacklistService,
	) {}

	async createSession(input: CreateSessionInput): Promise<SessionWithUser> {
		if (!input.userId || !input.jti) {
			throw new BadRequestException(
				'userId and jti are required to create a session',
			);
		}

		try {
			const hashedToken = await argon2.hash(input.refreshToken);
			const parsed = this.parseUserAgent(input.userAgent);

			const session = await this.prisma.session.create({
				data: {
					userId: input.userId,
					jti: input.jti,
					familyId: input.familyId ?? null,
					tokenHash: hashedToken,
					ipAddress: input.ipAddress ?? null,
					userAgent: input.userAgent ?? null,
					location: input.location ?? null,
					device: parsed.device,
					os: parsed.os,
					browser: parsed.browser,
					expiresAt: input.expiresAt,
				},
				include: { user: true },
			});

			this.logger.log(
				`Session created for user ${session.user.username ?? session.user.email} (jti=${input.jti})`,
			);

			return session as SessionWithUser;
		} catch (error) {
			this.logger.error('Error creating session', error);
			throw new BadRequestException('Failed to create session');
		}
	}

	/**
	 * Validates a session by jti. First consults Redis blacklist (fast deny),
	 * then Postgres (source of truth). Touches `lastUsedAt` opportunistically.
	 */
	async validateSession(jti: string): Promise<boolean> {
		if (!jti) return false;

		if (await this.blacklist.isRevoked(jti)) {
			return false;
		}

		const session = await this.prisma.session.findUnique({
			where: { jti },
			select: { id: true, revokedAt: true, expiresAt: true },
		});

		if (!session) return false;
		if (session.revokedAt) return false;
		if (session.expiresAt.getTime() <= Date.now()) return false;

		// Fire-and-forget lastUsedAt bump; ignore failures.
		this.prisma.session
			.update({
				where: { id: session.id },
				data: { lastUsedAt: new Date() },
			})
			.catch(() => undefined);

		return true;
	}

	async findByJti(jti: string): Promise<Session | null> {
		return this.prisma.session.findUnique({ where: { jti } });
	}

	async revokeByJti(jti: string): Promise<void> {
		const session = await this.prisma.session.findUnique({
			where: { jti },
		});
		if (!session) return;

		await this.revokeSessionInternal(session);
	}

	async revokeById(userId: string, sessionId: string): Promise<void> {
		const session = await this.prisma.session.findUnique({
			where: { id: sessionId },
		});

		if (!session || session.userId !== userId) {
			throw new NotFoundException('Session not found');
		}

		await this.revokeSessionInternal(session);
		this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
	}

	async revokeAllForUser(
		userId: string,
		exceptJti?: string,
	): Promise<number> {
		const sessions = await this.prisma.session.findMany({
			where: {
				userId,
				revokedAt: null,
				...(exceptJti ? { jti: { not: exceptJti } } : {}),
			},
		});

		for (const session of sessions) {
			await this.revokeSessionInternal(session);
		}

		this.logger.log(
			`Revoked ${sessions.length} sessions for user ${userId}` +
				(exceptJti ? ` (except current jti=${exceptJti})` : ''),
		);

		return sessions.length;
	}

	async revokeFamily(familyId: string): Promise<number> {
		const sessions = await this.prisma.session.findMany({
			where: { familyId, revokedAt: null },
		});

		for (const session of sessions) {
			await this.revokeSessionInternal(session);
		}

		this.logger.warn(
			`Revoked entire session family ${familyId} (${sessions.length} sessions) — possible refresh-token reuse`,
		);

		return sessions.length;
	}

	async findAllForUser(
		userId: string,
		currentJti?: string,
	): Promise<SessionInfo[]> {
		const sessions = await this.prisma.session.findMany({
			where: {
				userId,
				revokedAt: null,
				expiresAt: { gt: new Date() },
			},
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				jti: true,
				familyId: true,
				ipAddress: true,
				userAgent: true,
				device: true,
				os: true,
				browser: true,
				location: true,
				createdAt: true,
				expiresAt: true,
				lastUsedAt: true,
			},
		});

		return sessions.map((s) => ({
			...s,
			current: currentJti !== undefined && s.jti === currentJti,
		}));
	}

	/**
	 * Rotates a refresh token. Detects reuse of an already-revoked jti and
	 * revokes the entire family on hit (OWASP best practice against stolen
	 * refresh tokens).
	 *
	 * Returns the new session row.
	 */
	async rotateRefresh(input: RotateRefreshInput): Promise<SessionWithUser> {
		const old = await this.prisma.session.findUnique({
			where: { jti: input.oldJti },
		});

		if (!old) {
			throw new UnauthorizedException('Session not found');
		}

		if (old.userId !== input.userId) {
			throw new UnauthorizedException('Session does not belong to user');
		}

		// Reuse detection: someone is trying to refresh with a token that was
		// already rotated or revoked. Treat as compromise.
		if (old.revokedAt) {
			await this.revokeFamily(old.familyId ?? '');
			throw new UnauthorizedException(
				'Refresh token reuse detected — all sessions revoked',
			);
		}

		// Family must match (a token from a different family can never refresh).
		if (!old.familyId || old.familyId !== input.familyId) {
			// Treat mismatch as suspicious too — revoke the existing one and
			// the family it belongs to.
			await this.revokeByJti(old.jti);
			if (old.familyId) {
				await this.revokeFamily(old.familyId);
			}
			throw new UnauthorizedException('Session family mismatch');
		}

		return this.prisma.$transaction(async (tx) => {
			// Revoke the old session
			await tx.session.update({
				where: { id: old.id },
				data: { revokedAt: new Date() },
			});

			// Push old jti to blacklist for remaining access-token lifetime
			const remainingAccessSeconds = Math.max(
				1,
				Math.floor((old.expiresAt.getTime() - Date.now()) / 1000),
			);
			await this.blacklist.revoke(old.jti, remainingAccessSeconds);

			const hashedToken = await argon2.hash(input.newRefreshToken);
			const parsed = this.parseUserAgent(input.userAgent);

			const next = await tx.session.create({
				data: {
					userId: input.userId,
					jti: input.newJti,
					familyId: input.familyId,
					tokenHash: hashedToken,
					ipAddress: input.ipAddress ?? null,
					userAgent: input.userAgent ?? null,
					location: input.location ?? null,
					device: parsed.device,
					os: parsed.os,
					browser: parsed.browser,
					expiresAt: input.refreshExpiresAt,
				},
				include: { user: true },
			});

			this.logger.log(
				`Session rotated for user ${next.user.username ?? next.user.email} (new jti=${input.newJti})`,
			);

			return next as SessionWithUser;
		});
	}

	parseUserAgent(ua?: string | null): {
		device: string | null;
		os: string | null;
		browser: string | null;
	} {
		if (!ua) {
			return { device: null, os: null, browser: null };
		}
		try {
			const result = new UAParser(ua).getResult();
			return {
				device:
					result.device.type && result.device.vendor
						? `${result.device.vendor} ${result.device.model ?? result.device.type}`.trim()
						: (result.device.model ?? result.device.type ?? null),
				os: result.os.name
					? `${result.os.name}${result.os.version ? ` ${result.os.version}` : ''}`
					: null,
				browser: result.browser.name
					? `${result.browser.name}${result.browser.version ? ` ${result.browser.version}` : ''}`
					: null,
			};
		} catch {
			return { device: null, os: null, browser: null };
		}
	}

	private async revokeSessionInternal(session: Session): Promise<void> {
		const now = new Date();
		await this.prisma.session.update({
			where: { id: session.id },
			data: { revokedAt: session.revokedAt ?? now },
		});

		const remainingSeconds = Math.max(
			1,
			Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
		);
		await this.blacklist.revoke(session.jti, remainingSeconds);
	}
}