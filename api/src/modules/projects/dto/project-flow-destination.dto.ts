import { Type } from 'class-transformer';
import {
	IsIn,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	Min,
} from 'class-validator';

/**
 * Same shape as vaults' FlowDestinationDto, except a VAULT destination
 * names one of this submission's own project vaults (vaultName) rather than
 * an existing vaultId, since those vaults don't exist yet at submission
 * time; ProjectsService resolves the name to a real id once they're created
 * in the same transaction.
 */
export class ProjectFlowDestinationDto {
	@IsIn(['VAULT', 'MEMBER_WITHDRAWABLE_VAULTS'])
	destinationType: 'VAULT' | 'MEMBER_WITHDRAWABLE_VAULTS';

	@IsOptional()
	@IsString()
	vaultName?: string;

	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(0)
	@Max(100)
	percentage: number;
}
