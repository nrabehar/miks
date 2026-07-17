import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

@Injectable()
export class ConfigService {
	constructor(
		private readonly nestConfigService: NestConfigService<AppConfig, true>,
	) {}

	get app() {
		return this.nestConfigService.get('app', { infer: true });
	}

	get db() {
		return this.nestConfigService.get('db', { infer: true });
	}

	get jwt() {
		return this.nestConfigService.get('jwt', { infer: true });
	}

	get mail() {
		return this.nestConfigService.get('mail', { infer: true });
	}

	get auth() {
		return this.nestConfigService.get('auth', { infer: true });
	}

	get oauth() {
		return this.nestConfigService.get('oauth', { infer: true });
	}
}
