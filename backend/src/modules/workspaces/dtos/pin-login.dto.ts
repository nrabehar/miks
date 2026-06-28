import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class PinLoginDto {
	@IsString()
	@IsNotEmpty()
	declare workspaceId: string;

	@IsString()
	@Length(4, 6)
	@Matches(/^\d+$/, { message: 'pin must contain only digits' })
	declare pin: string;
}
