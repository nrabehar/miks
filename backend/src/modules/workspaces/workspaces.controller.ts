import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateWorkspaceDto } from './dtos/create-workspace.dto';
import { InviteDto } from './dtos/invite.dto';
import { WorkspacesService } from './workspaces.service';

type AuthedRequest = Request & { user: JwtPayload };

class UpdateRoleDto {
	declare role: string;
}

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
	constructor(private readonly workspacesService: WorkspacesService) {}

	/** List all workspaces the authenticated user belongs to */
	@Get()
	async list(@Req() req: AuthedRequest) {
		return this.workspacesService.findAllForUser(req.user.sub);
	}

	/** Create a new workspace (caller becomes admin) */
	@Post()
	async create(@Req() req: AuthedRequest, @Body() body: CreateWorkspaceDto) {
		return this.workspacesService.create(body.name, req.user.sub);
	}

	/** Get a single workspace (must be a member) */
	@Get(':id')
	async findOne(@Req() req: AuthedRequest, @Param('id') id: string) {
		return this.workspacesService.findById(id, req.user.sub);
	}

	/** Delete a workspace (admin only) */
	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async remove(@Req() req: AuthedRequest, @Param('id') id: string): Promise<void> {
		await this.workspacesService.delete(id, req.user.sub);
	}

	/** Invite a user by email (admin only) */
	@Post(':id/members')
	async invite(
		@Req() req: AuthedRequest,
		@Param('id') id: string,
		@Body() body: InviteDto,
	) {
		return this.workspacesService.inviteMember(id, req.user.sub, body.email, body.role);
	}

	/** Remove a member (admin, or self-removal) */
	@Delete(':id/members/:userId')
	@HttpCode(HttpStatus.NO_CONTENT)
	async removeMember(
		@Req() req: AuthedRequest,
		@Param('id') id: string,
		@Param('userId') userId: string,
	): Promise<void> {
		await this.workspacesService.removeMember(id, req.user.sub, userId);
	}

	/** Change a member's role (admin only) */
	@Patch(':id/members/:userId/role')
	async updateRole(
		@Req() req: AuthedRequest,
		@Param('id') id: string,
		@Param('userId') userId: string,
		@Body() body: UpdateRoleDto,
	) {
		return this.workspacesService.updateMemberRole(id, req.user.sub, userId, body.role);
	}
}
