import { IsNotEmpty, IsNumberString, MaxLength, MinLength } from "class-validator";

export class EmailConfirmDto {
	@IsNotEmpty()
	@IsNumberString()
	@MaxLength(6)
	@MinLength(6)
	code: string = '';
}