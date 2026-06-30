import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
