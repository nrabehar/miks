import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateGroupDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsString()
	@Length(3, 3)
	currencyCode?: string;
}
