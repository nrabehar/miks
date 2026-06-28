import { IsEmail, IsOptional, IsString, IsIn } from 'class-validator';

export class InviteDto {
	@IsEmail()
	declare email: string;

	@IsOptional()
	@IsString()
	@IsIn(['admin', 'member', 'observer'])
	declare role?: string;
}
