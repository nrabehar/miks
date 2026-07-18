import { IsString } from 'class-validator';

export class ConfirmDeviceDto {
	@IsString()
	confirmationId: string;

	@IsString()
	code: string;
}
