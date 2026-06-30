import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  budget?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  sourceVaultId?: string;

  @IsDateString()
  voteClosesAt!: string;

  @IsInt()
  @Min(1)
  voteThreshold!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  voteQuorum?: number;
}
