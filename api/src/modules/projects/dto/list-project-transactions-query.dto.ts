import { ListQueryDto } from '$/groups/dto/list-query.dto';
import { IsOptional, IsString } from 'class-validator';

export class ListProjectTransactionsQueryDto extends ListQueryDto {
	@IsOptional()
	@IsString()
	vaultId?: string;
}
