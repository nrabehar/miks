import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateContributionDto {
	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	amount: number;

	@IsOptional()
	@IsString()
	paymentMethodCode?: string;
}
