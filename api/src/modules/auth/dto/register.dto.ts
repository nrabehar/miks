import { IsString, MinLength, ValidateIf } from 'class-validator';

export class RegisterDto {
	@ValidateIf((dto: RegisterDto) => !dto.phone)
	@IsString()
	email?: string;

	@ValidateIf((dto: RegisterDto) => !dto.email)
	@IsString()
	phone?: string;

	@IsString()
	@MinLength(8)
	password: string;

	@IsString()
	displayName: string;
}
