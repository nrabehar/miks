import {
	IsEmail,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator';

export class UserRegisterDto {
	@IsEmail({}, { message: 'Invalid email address' })
	@IsNotEmpty()
	email: string = '';

	@IsString()
	@IsNotEmpty()
	@MinLength(3, { message: 'Username must be at least 3 characters' })
	@MaxLength(15, { message: 'Username must not exceed 15 characters' })
	@Matches(/^[a-zA-Z0-9_]+$/, {
		message: 'Username can only contain letters, numbers, and underscores',
	})
	username: string = '';

	@IsStrongPassword(
		{},
		{
			message:
				'Password must be strong (uppercase, lowercase, number, symbol)',
		},
	)
	@MinLength(8, { message: 'Password must be at least 8 characters' })
	@MaxLength(25, { message: 'Password must not exceed 25 characters' })
	@IsNotEmpty()
	password: string = '';
	
}
