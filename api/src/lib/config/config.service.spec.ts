import { ConfigService as NestConfigService } from '@nestjs/config';
import { ConfigService } from './config.service';
import { AppConfig } from './configuration';

describe('ConfigService.oauth', () => {
	it('delegates to the underlying NestConfigService for the "oauth" key', () => {
		const oauthConfig = {
			webUrl: 'http://localhost:5173',
			google: { clientId: 'id', clientSecret: 'secret', redirectUri: 'uri' },
		};
		const nestConfigService = {
			get: jest.fn().mockReturnValue(oauthConfig),
		} as unknown as NestConfigService<AppConfig, true>;

		const service = new ConfigService(nestConfigService);

		expect(service.oauth).toBe(oauthConfig);
		expect(nestConfigService.get).toHaveBeenCalledWith('oauth', {
			infer: true,
		});
	});
});
