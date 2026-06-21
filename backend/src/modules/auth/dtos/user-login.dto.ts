import {
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength
} from 'class-validator';

export class UserLoginDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @MinLength(2)
  identifier: string = '';

  @IsStrongPassword()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string = '';
}