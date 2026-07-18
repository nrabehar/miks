import { IsString } from 'class-validator';

export class ResendDeviceConfirmationDto {
	@IsString()
	confirmationId: string;
}
