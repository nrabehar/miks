import { Type } from 'class-transformer';
import {
	IsArray,
	IsInt,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	Min,
	ValidateNested,
} from 'class-validator';

export class CotisationEntryDto {
	@IsString()
	@IsNotEmpty()
	declare memberId: string;

	@IsNumber()
	@Min(1)
	declare amount: number;

	@IsInt()
	@Min(1)
	@Max(12)
	declare month: number;

	@IsInt()
	@Min(2024)
	declare year: number;

	@IsString()
	@IsOptional()
	declare note?: string;
}

export class BatchCotisationsDto {
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CotisationEntryDto)
	declare entries: CotisationEntryDto[];
}
