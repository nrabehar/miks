import { PrismaService } from '#/core/prisma/prisma.service';
import {
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as speakeasy from 'speakeasy';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

export type JwtKeyType = 'Secret' | 'RefreshSecret';

export interface GeneratedTokenPair {
	accessToken: string;
	refreshToken: string;
	accessJti: string;
	refreshJti: string;
	familyId: string;
	accessExpiresAt: Date;
	refreshExpiresAt: Date;
}

@Injectable()
export class TokenService {
	private readonly logger = new Logger(TokenService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
		private readonly jwtService: JwtService,
	) {}

	async createToken(userId: string, expiresMinutes: number = 15) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});
		if (!user) throw new NotFoundException('User not found');

		if (!user.tokenSecret) {
			const secret = this.getSecret(user.id);
			await this.prisma.user.update({
				where: { id: userId },
				data: { tokenSecret: secret.base32 },
			});
			user.tokenSecret = secret.base32;
		}

		const token = speakeasy.totp({
			secret: user.tokenSecret,
			encoding: 'base32',
			step: expiresMinutes * 60,
		});

		this.logger.debug(`Created token for user ${userId}`);
		return token;
	}

	async create2FASecret(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});
		if (!user) throw new NotFoundException('User not found');
		const secret = this.getSecret(user.email);

		await this.prisma.user.update({
			where: { id: userId },
			data: { twoFaSecret: secret.base32 },
		});

		this.logger.debug(`Created 2FA token for user ${userId}`);
		return { secret: secret.base32, qrUrl: secret.otpauth_url };
	}

	async validateToken(
		userId: string,
		token: string,
		expiresMinutes: number = 15,
	) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});
		if (!user || !user.tokenSecret) return false;

		return speakeasy.totp.verify({
			secret: user.tokenSecret,
			encoding: 'base32',
			step: expiresMinutes * 60,
			token,
			window: 1,
		});
	}

	async validate2FAToken(userId: string, token: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});
		if (!user || !user.twoFaSecret) return false;

		return speakeasy.totp.verify({
			secret: user.twoFaSecret,
			encoding: 'base32',
			step: 30,
			token,
			window: 1,
		});
	}

	generateJwtToken(
		payload: JwtPayload,
		familyId?: string,
	): GeneratedTokenPair {
		try {
			const accessJti = randomUUID();
			const refreshJti = randomUUID();
			const fid = familyId ?? randomUUID();

			const accessExpiresIn = 24 * 60 * 60;
			const refreshExpiresIn = 7 * 24 * 60 * 60;

			const nowSeconds = Math.floor(Date.now() / 1000);
			const accessExpiresAt = new Date((nowSeconds + accessExpiresIn) * 1000);
			const refreshExpiresAt = new Date(
				(nowSeconds + refreshExpiresIn) * 1000,
			);

			const accessToken = this.jwtService.sign(
				{ ...payload, jti: accessJti, familyId: fid },
				{
					secret: this.configService.get<string>('auth.jwtSecret'),
					expiresIn: accessExpiresIn,
				},
			);

			const refreshToken = this.jwtService.sign(
				{ ...payload, jti: refreshJti, familyId: fid, typ: 'refresh' },
				{
					secret: this.configService.get<string>('auth.jwtRefreshSecret'),
					expiresIn: refreshExpiresIn,
				},
			);

			return {
				accessToken,
				refreshToken,
				accessJti,
				refreshJti,
				familyId: fid,
				accessExpiresAt,
				refreshExpiresAt,
			};
		} catch (error) {
			this.logger.error(
				'Failed to generate tokens',
				error instanceof Error ? error.stack : undefined,
			);
			throw new UnauthorizedException(
				'Failed to generate authentication tokens',
			);
		}
	}

	decodeJwtToken(token: string, keyType: JwtKeyType): JwtPayload {
		try {
			return this.jwtService.verify(token, {
				secret: this.configService.get<string>(`auth.jwt${keyType}`),
			});
		} catch {
			throw new UnauthorizedException('Invalid or expired token');
		}
	}

	private getSecret(issuer: string = 'miks') {
		return speakeasy.generateSecret({
			length: 20,
			issuer,
			name: `Miks ${issuer}`,
		});
	}
}
