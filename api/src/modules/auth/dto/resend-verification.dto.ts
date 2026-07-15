import { IsString } from 'class-validator';

export class ResendVerificationDto {
	@IsString()
	identifier: string;
}
