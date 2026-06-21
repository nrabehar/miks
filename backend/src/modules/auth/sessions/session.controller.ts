import { JwtPayload } from '#/modules/auth/strategies/jwt.strategy';
import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionIdDto } from '../dtos/session-id.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SessionService } from './session.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('auth/sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
	constructor(private readonly sessionService: SessionService) {}

	@Get()
	async list(@Req() req: AuthedRequest) {
		const user = req.user;
		const sessions = await this.sessionService.findAllForUser(
			user.sub,
			user.jti,
		);
		return { sessions };
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async revokeOne(
		@Req() req: AuthedRequest,
		@Param() params: SessionIdDto,
	): Promise<void> {
		await this.sessionService.revokeById(req.user.sub, params.id);
	}

	@Post('revoke-others')
	@HttpCode(HttpStatus.OK)
	async revokeOthers(@Req() req: AuthedRequest) {
		const revoked = await this.sessionService.revokeAllForUser(
			req.user.sub,
			req.user.jti,
		);
		return { revoked };
	}
}