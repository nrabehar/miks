import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsIn,
	IsOptional,
	IsString,
	ValidateNested,
} from 'class-validator';
import { ProjectFlowDestinationDto } from './project-flow-destination.dto';

export class CreateProjectFlowRuleDto {
	@IsIn(['PROJECT_REVENUE', 'PROJECT_EXPENSE'])
	sourceType: 'PROJECT_REVENUE' | 'PROJECT_EXPENSE';

	@IsOptional()
	@IsString()
	name?: string;

	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => ProjectFlowDestinationDto)
	destinations: ProjectFlowDestinationDto[];
}
