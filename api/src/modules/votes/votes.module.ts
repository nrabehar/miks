import { Module } from '@nestjs/common';
import { VoteConfigController } from './vote-config.controller';
import { VoteConfigService } from './vote-config.service';
import { VoteResolverRegistry } from './vote-resolver.registry';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
	controllers: [VotesController, VoteConfigController],
	providers: [VotesService, VoteResolverRegistry, VoteConfigService],
	exports: [VotesService, VoteResolverRegistry, VoteConfigService],
})
export class VotesModule {}
