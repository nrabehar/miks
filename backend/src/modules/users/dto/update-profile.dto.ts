import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{7,15}$/)
  phone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['fr', 'en', 'mg'])
  language?: string;
}
