import { Public } from '#/common/decorators/public.decorator';
import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Logger,
	Post,
	Req,
	UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { EmailConfirmDto } from '../dtos/email-confirm.dto';
import { JwtPayload } from '../strategies/jwt.strategy';
import { EmailService } from './email.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('auth/email')
export class EmailController {
	private readonly logger = new Logger(EmailController.name);

	constructor(private readonly emailService: EmailService) {}

	@Public()
	@Post('confirm')
	@HttpCode(HttpStatus.OK)
	async confirmEmail(@Req() req: AuthedRequest, @Body() body: EmailConfirmDto) {
		const { user } = req;
		const { code } = body;
		const result = await this.emailService.confirmUserEmail(user.sub, code);
		if (result) {
			this.logger.log(`Email confirmed for user ${user.sub}`);
			return { message: 'Email confirmed successfully' };
		} else {
			this.logger.warn(
				`Failed email confirmation attempt for user ${user.sub}`,
			);
			throw new UnauthorizedException(
				'Invalid or expired confirmation code',
			);
		}
	}
}
