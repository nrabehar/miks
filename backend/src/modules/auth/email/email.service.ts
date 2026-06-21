import { PrismaService } from '#/core/prisma/prisma.service';
import { TokenService } from '#/modules/tokens/token.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly tokenService: TokenService,
	) {}

	async confirmUserEmail(userId: string, code: string): Promise<boolean> {
		const validate = await this.tokenService.validateToken(
			userId,
			code,
			15,
		);
		if (!validate) return false;

		await this.prisma.user.update({
			where: { id: userId },
			data: { emailVerified: true },
		});

		return validate;
	}
}
