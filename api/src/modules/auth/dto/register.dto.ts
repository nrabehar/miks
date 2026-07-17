import { IsString, MinLength } from 'class-validator';

export class RegisterDto {
	@IsString()
	email: string;

	@IsString()
	@MinLength(8)
	password: string;

	@IsString()
	displayName: string;
}
