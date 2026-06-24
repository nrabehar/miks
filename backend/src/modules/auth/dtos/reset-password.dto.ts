import { IsString, IsStrongPassword, IsUUID, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
	@IsUUID()
	userId: string = '';

	@IsString()
	@Length(6, 6, { message: 'Code must be exactly 6 characters' })
	code: string = '';

	@IsStrongPassword({}, { message: 'Password must be strong (uppercase, lowercase, number, symbol)' })
	@MinLength(8, { message: 'Password must be at least 8 characters' })
	@MaxLength(25, { message: 'Password must not exceed 25 characters' })
	newPassword: string = '';
}
