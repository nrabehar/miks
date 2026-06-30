import { IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,4}$/)
  currency?: string;
}
