import { ConfigService } from '$lib/config/config.service';
import {
	ExecutionContext,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
	constructor(private readonly config: ConfigService) {
		super();
	}

	canActivate(context: ExecutionContext) {
		if (
			!this.config.oauth.google.clientId ||
			!this.config.oauth.google.clientSecret
		) {
			throw new InternalServerErrorException('Google OAuth is not configured');
		}

		return super.canActivate(context);
	}
}
