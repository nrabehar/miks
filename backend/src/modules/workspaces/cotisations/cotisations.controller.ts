import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CotisationsService } from './cotisations.service';
import { BatchCotisationsDto } from './dtos/batch-cotisations.dto';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('workspaces/:workspaceId/cotisations')
@UseGuards(JwtAuthGuard)
export class CotisationsController {
	constructor(private readonly cotisationsService: CotisationsService) {}

	@Get()
	async list(
		@Req() req: AuthedRequest,
		@Param('workspaceId') workspaceId: string,
		@Query('month') month?: string,
		@Query('year') year?: string,
	) {
		const filters: { month?: number; year?: number } = {};
		if (month !== undefined) filters.month = parseInt(month, 10);
		if (year !== undefined) filters.year = parseInt(year, 10);
		return this.cotisationsService.listByWorkspace(workspaceId, req.user.sub, filters);
	}

	@Post('batch')
	async recordBatch(
		@Req() req: AuthedRequest,
		@Param('workspaceId') workspaceId: string,
		@Body() body: BatchCotisationsDto,
	) {
		return this.cotisationsService.recordBatch(workspaceId, req.user.sub, body.entries);
	}

	@Get('equity')
	async equity(
		@Req() req: AuthedRequest,
		@Param('workspaceId') workspaceId: string,
	) {
		return this.cotisationsService.computeEquity(workspaceId, req.user.sub);
	}

	@Get('summary')
	async summary(
		@Req() req: AuthedRequest,
		@Param('workspaceId') workspaceId: string,
	) {
		return this.cotisationsService.getSummary(workspaceId, req.user.sub);
	}
}
