import { IsUUID } from 'class-validator';

export class ResendEmailDto {
	@IsUUID()
	registrationId: string = '';
}
