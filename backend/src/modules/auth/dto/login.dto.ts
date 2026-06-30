import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class VerifyEmailDto {
  @IsString()
  userId: string;

  @IsString()
  code: string;
}

export class ResendEmailDto {
  @IsString()
  userId: string;
}

export class RefreshTokenDto {
  // refresh token comes from httpOnly cookie — no body field needed
}
