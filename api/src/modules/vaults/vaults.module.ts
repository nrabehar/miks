import { Module } from '@nestjs/common';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';
import { FlowRulesController } from './flow-rules.controller';
import { FlowRulesService } from './flow-rules.service';
import { LedgerController } from './ledger.controller';
import { SharesService } from './shares.service';
import { TransactionsService } from './transactions.service';
import { VaultsController } from './vaults.controller';
import { VaultsService } from './vaults.service';

@Module({
	controllers: [
		VaultsController,
		ContributionsController,
		FlowRulesController,
		LedgerController,
	],
	providers: [
		VaultsService,
		ContributionsService,
		FlowRulesService,
		TransactionsService,
		SharesService,
	],
	exports: [VaultsService, FlowRulesService],
})
export class VaultsModule {}
