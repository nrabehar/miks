import { VaultsModule } from '$/vaults/vaults.module';
import { VotesModule } from '$/votes/votes.module';
import { Module } from '@nestjs/common';
import { ProjectActivationService } from './project-activation.service';
import { ProjectEntriesService } from './project-entries.service';
import { ProjectVoteResolver } from './project-vote.resolver';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
	imports: [VaultsModule, VotesModule],
	controllers: [ProjectsController],
	providers: [
		ProjectsService,
		ProjectEntriesService,
		ProjectActivationService,
		ProjectVoteResolver,
	],
})
export class ProjectsModule {}
