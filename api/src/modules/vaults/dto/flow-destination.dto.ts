import { Type } from 'class-transformer';
import {
	IsIn,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	Min,
} from 'class-validator';

export class FlowDestinationDto {
	@IsIn(['VAULT', 'MEMBER_WITHDRAWABLE_VAULTS'])
	destinationType: 'VAULT' | 'MEMBER_WITHDRAWABLE_VAULTS';

	@IsOptional()
	@IsString()
	vaultId?: string;

	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(0)
	@Max(100)
	percentage: number;
}
