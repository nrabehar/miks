import { CurrentMember } from '$common/decorators/current-member.decorator';
import { GroupMembershipGuard } from '$common/guards/group-membership.guard';
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
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { SharesService } from './shares.service';
import { TransactionsService } from './transactions.service';

@UseGuards(GroupMembershipGuard)
@Controller('groups/:groupId')
export class LedgerController {
	constructor(
		private readonly transactions: TransactionsService,
		private readonly shares: SharesService,
	) {}

	@Get('transactions')
	list(
		@Param('groupId') groupId: string,
		@Query() query: ListTransactionsQueryDto,
	) {
		return this.transactions.list(groupId, query);
	}

	@Post('transactions/:id/reverse')
	reverse(
		@Param('groupId') groupId: string,
		@Param('id') id: string,
		@CurrentMember() member: GroupMember,
	) {
		return this.transactions.reverse(groupId, id, member);
	}

	@Post('me/withdraw')
	withdraw(
		@Param('groupId') groupId: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: WithdrawDto,
	) {
		return this.transactions.withdraw(groupId, member, dto);
	}

	@Get('shares')
	listShares(@Param('groupId') groupId: string) {
		return this.shares.list(groupId);
	}
}
