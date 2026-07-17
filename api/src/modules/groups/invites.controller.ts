import { CurrentUser } from '$common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
import { Public } from '$common/decorators/public.decorator';
import {
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
} from '@nestjs/common';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
	constructor(private readonly invites: InvitesService) {}

	@Public()
	@Get(':token')
	preview(@Param('token') token: string) {
		return this.invites.preview(token);
	}

	@Post(':token/accept')
	@HttpCode(HttpStatus.OK)
	accept(
		@Param('token') token: string,
		@CurrentUser() user: AuthenticatedUser,
	) {
		return this.invites.accept(token, user.id, user.email);
	}
}
