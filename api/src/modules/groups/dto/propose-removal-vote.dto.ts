import { IsInt, IsNumber, Min } from 'class-validator';

export class ProposeRemovalVoteDto {
	@IsNumber()
	@Min(0)
	approvalThreshold: number;

	@IsInt()
	@Min(1)
	minQuorum: number;

	@IsInt()
	@Min(1)
	durationHours: number;
}
