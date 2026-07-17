import { CurrentMember } from '$common/decorators/current-member.decorator';
import { GroupMembershipGuard } from '$common/guards/group-membership.guard';
import { ListQueryDto } from '$/groups/dto/list-query.dto';
import type { GroupMember } from '$prisma/client';
import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { CreateVaultDto } from './dto/create-vault.dto';
import { VaultsService } from './vaults.service';

@UseGuards(GroupMembershipGuard)
@Controller('groups/:groupId/vaults')
export class VaultsController {
	constructor(private readonly vaults: VaultsService) {}

	@Post()
	create(
		@Param('groupId') groupId: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: CreateVaultDto,
	) {
		return this.vaults.createGroupVault(groupId, member, dto);
	}

	@Get()
	list(@Param('groupId') groupId: string, @Query() query: ListQueryDto) {
		return this.vaults.list(groupId, query);
	}

	@Get(':id')
	get(@Param('groupId') groupId: string, @Param('id') id: string) {
		return this.vaults.get(groupId, id);
	}
}
