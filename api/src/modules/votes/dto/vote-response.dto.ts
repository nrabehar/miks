import { VoteChoice } from '$prisma/enums';
import { IsIn } from 'class-validator';

export class VoteResponseDto {
	@IsIn(Object.values(VoteChoice))
	choice: VoteChoice;
}
