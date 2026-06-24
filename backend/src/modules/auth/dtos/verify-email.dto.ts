import { IsUUID, Length } from 'class-validator';

export class VerifyEmailDto {
	@IsUUID()
	registrationId: string = '';

	@IsString()
	@Length(6, 6, { message: 'Code must be exactly 6 characters' })
	code: string = '';
}
