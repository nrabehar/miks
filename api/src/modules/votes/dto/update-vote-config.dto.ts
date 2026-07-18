import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateVoteConfigDto {
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	@Max(100)
	approvalThreshold?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	minQuorum?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	durationHours?: number;
}
