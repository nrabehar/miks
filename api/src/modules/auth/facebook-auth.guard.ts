import { ConfigService } from '$lib/config/config.service';
import {
	ExecutionContext,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
	constructor(private readonly config: ConfigService) {
		super();
	}

	canActivate(context: ExecutionContext) {
		if (
			!this.config.oauth.facebook.clientId ||
			!this.config.oauth.facebook.clientSecret
		) {
			throw new InternalServerErrorException(
				'Facebook OAuth is not configured',
			);
		}

		return super.canActivate(context);
	}
}
