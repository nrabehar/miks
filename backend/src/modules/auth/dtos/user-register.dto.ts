import {
	IsBoolean,
	IsEmail,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
	MaxLength,
	MinLength,
	Validate,
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsTrue', async: false })
class IsTrueConstraint implements ValidatorConstraintInterface {
	validate(value: unknown) {
		return value === true;
	}

	defaultMessage(args: ValidationArguments) {
		return `${args.property} must be true`;
	}
}

export class UserRegisterDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(2, { message: 'First name must be at least 2 characters' })
	firstName: string = '';

	@IsString()
	@IsNotEmpty()
	@MinLength(2, { message: 'Last name must be at least 2 characters' })
	lastName: string = '';

	@IsEmail({}, { message: 'Invalid email address' })
	@IsNotEmpty()
	email: string = '';

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

	@IsBoolean({ message: 'CGU must be a boolean' })
	@Validate(IsTrueConstraint, { message: 'You must accept the CGU to register' })
	cgu: boolean = false;

}
