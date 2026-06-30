import { IsEnum } from 'class-validator';

enum Choice {
  YES = 'YES',
  NO = 'NO',
  ABSTAIN = 'ABSTAIN',
}

export class CastVoteDto {
  @IsEnum(Choice)
  choice!: string;
}
