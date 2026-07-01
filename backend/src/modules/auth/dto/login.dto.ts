import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  registrationId!: string;

  @IsString()
  code!: string;
}

export class ResendEmailDto {
  @IsString()
  registrationId!: string;
}

export class RefreshTokenDto {
  // refresh token comes from httpOnly cookie — no body field needed
}
