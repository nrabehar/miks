import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RecordProjectEntryDto {
	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	amount: number;

	@IsOptional()
	@IsString()
	description?: string;
}
