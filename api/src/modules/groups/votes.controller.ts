import { CurrentUser } from '$common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
} from '@nestjs/common';
import { VoteResponseDto } from './dto/vote-response.dto';
import { VotesService } from './votes.service';

@Controller('votes')
export class VotesController {
	constructor(private readonly votes: VotesService) {}

	@Get(':voteId')
	get(
		@Param('voteId') voteId: string,
		@CurrentUser() user: AuthenticatedUser,
	) {
		return this.votes.get(voteId, user.id);
	}

	@Post(':voteId/responses')
	@HttpCode(HttpStatus.OK)
	respond(
		@Param('voteId') voteId: string,
		@CurrentUser() user: AuthenticatedUser,
		@Body() dto: VoteResponseDto,
	) {
		return this.votes.respond(voteId, user.id, dto.choice);
	}
}
