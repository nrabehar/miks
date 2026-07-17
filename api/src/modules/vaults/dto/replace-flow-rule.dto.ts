import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { FlowDestinationDto } from './flow-destination.dto';

export class ReplaceFlowRuleDto {
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => FlowDestinationDto)
	destinations: FlowDestinationDto[];
}
