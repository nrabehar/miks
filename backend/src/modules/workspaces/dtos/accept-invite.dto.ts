import { IsString, IsNotEmpty } from 'class-validator';

export class AcceptInviteDto {
	@IsString()
	@IsNotEmpty()
	declare token: string;
}
