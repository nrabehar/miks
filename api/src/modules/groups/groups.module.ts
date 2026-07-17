import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
	controllers: [GroupsController, InvitesController, VotesController],
	providers: [GroupsService, InvitesService, VotesService],
})
export class GroupsModule {}
