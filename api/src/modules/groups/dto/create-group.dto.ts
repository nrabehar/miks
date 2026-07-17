import { IsOptional, IsString, Length } from 'class-validator';

export class CreateGroupDto {
	@IsString()
	name: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsString()
	@Length(3, 3)
	currencyCode: string;
}
