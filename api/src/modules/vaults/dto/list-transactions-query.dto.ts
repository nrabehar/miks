import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '$/groups/dto/list-query.dto';

export class ListTransactionsQueryDto extends ListQueryDto {
	@IsOptional()
	@IsString()
	vaultId?: string;
}
