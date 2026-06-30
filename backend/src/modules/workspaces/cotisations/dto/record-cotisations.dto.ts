import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsPositive,
} from 'class-validator';

export class CotisationEntryDto {
  @IsString()
  memberId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RecordCotisationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CotisationEntryDto)
  entries: CotisationEntryDto[];
}
