import { IsString, Length, Matches } from 'class-validator';

export class CreateWorkspaceDto {
	@IsString()
	@Length(3, 60)
	@Matches(/^[a-zA-ZÀ-ÿ0-9 _'-]+$/, {
		message: 'name must contain only letters, numbers, spaces, hyphens, apostrophes or underscores',
	})
	declare name: string;
}
