import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsNumber,
	IsOptional,
	IsPositive,
	IsString,
	Length,
	ValidateNested,
} from 'class-validator';
import { CreateProjectFlowRuleDto } from './create-project-flow-rule.dto';

export class CreateProjectDto {
	@IsString()
	@Length(1, 200)
	title: string;

	@IsOptional()
	@IsString()
	description?: string;

	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	requestedBudget: number;

	@IsString()
	sourceVaultId: string;

	@ArrayMinSize(1)
	@IsString({ each: true })
	vaults: string[];

	@IsOptional()
	@IsString()
	payoutVaultName?: string;

	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreateProjectFlowRuleDto)
	flowRules: CreateProjectFlowRuleDto[];
}
