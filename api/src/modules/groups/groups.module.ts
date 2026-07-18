import { VaultsModule } from '$/vaults/vaults.module';
import { VotesModule } from '$/votes/votes.module';
import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { MemberRemovalVoteResolver } from './member-removal-vote.resolver';
import { RemovalVotesService } from './removal-votes.service';

@Module({
	imports: [VaultsModule, VotesModule],
	controllers: [GroupsController, InvitesController],
	providers: [
		GroupsService,
		InvitesService,
		RemovalVotesService,
		MemberRemovalVoteResolver,
	],
})
export class GroupsModule {}
