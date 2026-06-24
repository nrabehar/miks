import { IsString, IsUUID, Length } from 'class-validator';

export class Verify2FADto {
	@IsUUID()
	challengeId: string = '';

	@IsString()
	@Length(6, 6, { message: 'Code must be exactly 6 characters' })
	code: string = '';
}