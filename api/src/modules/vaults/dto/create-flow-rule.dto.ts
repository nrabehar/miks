import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsIn,
	IsOptional,
	IsString,
	ValidateNested,
} from 'class-validator';
import { FlowDestinationDto } from './flow-destination.dto';

export class CreateFlowRuleDto {
	@IsIn(['CONTRIBUTION', 'MANUAL_ENTRY'])
	sourceType: 'CONTRIBUTION' | 'MANUAL_ENTRY';

	@IsOptional()
	@IsString()
	name?: string;

	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => FlowDestinationDto)
	destinations: FlowDestinationDto[];
}
