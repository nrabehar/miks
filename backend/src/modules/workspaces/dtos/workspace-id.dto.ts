import { IsString, IsNotEmpty } from 'class-validator';

export class WorkspaceIdDto {
	@IsString()
	@IsNotEmpty()
	declare id: string;
}
