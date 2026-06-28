import { IsString, Length, Matches } from 'class-validator';

export class SetPinDto {
	@IsString()
	@Length(4, 6)
	@Matches(/^\d+$/, { message: 'pin must contain only digits' })
	declare pin: string;
}
