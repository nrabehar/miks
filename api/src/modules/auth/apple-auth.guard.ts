import { ConfigService } from '$lib/config/config.service';
import {
	ExecutionContext,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AppleAuthGuard extends AuthGuard('apple') {
	constructor(private readonly config: ConfigService) {
		super();
	}

	canActivate(context: ExecutionContext) {
		const { apple } = this.config.oauth;

		if (!apple.clientId || !apple.teamId || !apple.keyId || !apple.privateKey) {
			throw new InternalServerErrorException('Apple Sign In is not configured');
		}

		return super.canActivate(context);
	}
}
