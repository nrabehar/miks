import { Type } from 'class-transformer';
import { IsNumber, IsPositive } from 'class-validator';

export class WithdrawDto {
	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	amount: number;
}
