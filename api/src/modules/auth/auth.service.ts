import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import { PasswordService } from '$lib/password/password.service';
import {
	JwtPayload,
	TokenPair,
	TokenService,
} from '$lib/auth-token/token.service';
import {
	ConflictException,
	HttpException,
	HttpStatus,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RegisterDto } from './dto/register.dto';

export interface AuthenticatedIdentity {
	id: string;
	email: string | null;
	phone: string | null;
	displayName: string;
	role: string;
}

export interface SessionMeta {
	userAgent?: string;
	ip?: string;
}

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly password: PasswordService,
		private readonly tokenService: TokenService,
		private readonly config: ConfigService,
	) {}

	async register(dto: RegisterDto): Promise<AuthenticatedIdentity> {
		const existing = await this.prisma.userIdentity.findUnique({
			where: {
				providerCode_identifier: {
					providerCode: 'local',
					identifier: dto.email,
				},
			},
		});

		if (existing) {
			throw new ConflictException('This email is already in use');
		}

		const secretHash = await this.password.hash(dto.password);

		const user = await this.prisma.user.create({
			data: {
				email: dto.email,
				displayName: dto.displayName,
				identities: {
					create: {
						providerCode: 'local',
						identifier: dto.email,
						secretHash,
					},
				},
			},
		});

		return this.toAuthenticatedIdentity(user);
	}

	async validateLocalLogin(
		identifier: string,
		plainPassword: string,
	): Promise<AuthenticatedIdentity> {
		const identity = await this.prisma.userIdentity.findUnique({
			where: {
				providerCode_identifier: {
					providerCode: 'local',
					identifier,
				},
			},
			include: { user: true },
		});

		if (!identity || !identity.secretHash) {
			throw new UnauthorizedException('Invalid credentials');
		}

		if (identity.lockedUntil && identity.lockedUntil > new Date()) {
			throw new HttpException(
				'Account temporarily locked, try again later',
				HttpStatus.LOCKED,
			);
		}

		const passwordValid = await this.password.verify(
			identity.secretHash,
			plainPassword,
		);

		if (!passwordValid) {
			await this.registerFailedAttempt(
				identity.id,
				identity.failedAttempts,
			);
			throw new UnauthorizedException('Invalid credentials');
		}

		await this.prisma.userIdentity.update({
			where: { id: identity.id },
			data: {
				failedAttempts: 0,
				lockedUntil: null,
				lastUsedAt: new Date(),
			},
		});

		return this.toAuthenticatedIdentity(identity.user);
	}

	async validateOAuthLogin(
		providerCode: string,
		profile: {
			providerAccountId: string;
			email: string | null;
			emailVerified: boolean;
			displayName: string;
			accessToken?: string;
			refreshToken?: string;
		},
	): Promise<AuthenticatedIdentity> {
		const existingIdentity = await this.prisma.userIdentity.findUnique({
			where: {
				providerCode_providerAccountId: {
					providerCode,
					providerAccountId: profile.providerAccountId,
				},
			},
			include: { user: true },
		});

		if (existingIdentity) {
			await this.prisma.userIdentity.update({
				where: { id: existingIdentity.id },
				data: {
					accessToken: profile.accessToken,
					refreshToken: profile.refreshToken,
					lastUsedAt: new Date(),
				},
			});

			return this.toAuthenticatedIdentity(existingIdentity.user);
		}

		const existingUser = profile.emailVerified
			? await this.prisma.user.findUnique({
					where: { email: profile.email ?? undefined },
				})
			: null;

		if (existingUser) {
			await this.prisma.userIdentity.create({
				data: {
					userId: existingUser.id,
					providerCode,
					providerAccountId: profile.providerAccountId,
					accessToken: profile.accessToken,
					refreshToken: profile.refreshToken,
					emailVerified: true,
					lastUsedAt: new Date(),
				},
			});

			return this.toAuthenticatedIdentity(existingUser);
		}

		const user = await this.prisma.user.create({
			data: {
				email: profile.email,
				displayName: profile.displayName,
				identities: {
					create: {
						providerCode,
						providerAccountId: profile.providerAccountId,
						accessToken: profile.accessToken,
						refreshToken: profile.refreshToken,
						emailVerified: profile.emailVerified,
						lastUsedAt: new Date(),
					},
				},
			},
		});

		return this.toAuthenticatedIdentity(user);
	}

	private async registerFailedAttempt(
		identityId: string,
		currentAttempts: number,
	): Promise<void> {
		const failedAttempts = currentAttempts + 1;
		const shouldLock =
			failedAttempts >= this.config.auth.lockoutMaxAttempts;

		await this.prisma.userIdentity.update({
			where: { id: identityId },
			data: {
				failedAttempts,
				lockedUntil: shouldLock
					? new Date(
							Date.now() +
								this.config.auth.lockoutDurationMinutes *
									60 *
									1000,
						)
					: null,
			},
		});
	}

	async createSession(
		user: AuthenticatedIdentity,
		meta: SessionMeta,
	): Promise<TokenPair> {
		const sessionId = randomUUID();
		const payload: JwtPayload = {
			sub: user.id,
			role: user.role,
			sid: sessionId,
		};

		const accessToken = this.tokenService.signAccessToken(payload);
		const refreshToken = this.tokenService.signRefreshToken(payload);

		await this.prisma.session.create({
			data: {
				id: sessionId,
				userId: user.id,
				refreshToken,
				userAgent: meta.userAgent,
				ip: meta.ip,
				expiresAt: this.refreshTokenExpiry(),
			},
		});

		return { accessToken, refreshToken };
	}

	async rotateSession(rawRefreshToken: string): Promise<TokenPair> {
		let payload: JwtPayload;

		try {
			payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
		} catch {
			throw new UnauthorizedException('Invalid or expired refresh token');
		}

		const session = await this.prisma.session.findUnique({
			where: { id: payload.sid },
		});

		if (!session || session.revokedAt) {
			throw new UnauthorizedException('Session no longer valid');
		}

		if (session.refreshToken !== rawRefreshToken) {
			await this.prisma.session.update({
				where: { id: session.id },
				data: { revokedAt: new Date() },
			});
			throw new UnauthorizedException(
				'Refresh token already used, session revoked',
			);
		}

		if (session.expiresAt < new Date()) {
			throw new UnauthorizedException('Session expired');
		}

		const nextPayload: JwtPayload = {
			sub: payload.sub,
			role: payload.role,
			sid: session.id,
		};

		const accessToken = this.tokenService.signAccessToken(nextPayload);
		const refreshToken = this.tokenService.signRefreshToken(nextPayload);

		await this.prisma.session.update({
			where: { id: session.id },
			data: { refreshToken, expiresAt: this.refreshTokenExpiry() },
		});

		return { accessToken, refreshToken };
	}

	async revokeSessionByRefreshToken(rawRefreshToken: string): Promise<void> {
		let payload: JwtPayload;

		try {
			payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
		} catch {
			return;
		}

		await this.prisma.session.updateMany({
			where: { id: payload.sid, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}

	private refreshTokenExpiry(): Date {
		const match = /^(\d+)([smhd])$/.exec(this.config.jwt.refreshExpiresIn);
		const amount = match ? parseInt(match[1], 10) : 30;
		const unit = match ? match[2] : 'd';
		const unitMs: Record<string, number> = {
			s: 1000,
			m: 60 * 1000,
			h: 60 * 60 * 1000,
			d: 24 * 60 * 60 * 1000,
		};

		return new Date(Date.now() + amount * unitMs[unit]);
	}

	private toAuthenticatedIdentity(user: {
		id: string;
		email: string | null;
		phone: string | null;
		displayName: string;
		role: string;
	}): AuthenticatedIdentity {
		return {
			id: user.id,
			email: user.email,
			phone: user.phone,
			displayName: user.displayName,
			role: user.role,
		};
	}
}
