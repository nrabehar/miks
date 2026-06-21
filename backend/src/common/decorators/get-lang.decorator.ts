import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetLang = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): string => {
		const request = ctx.switchToHttp().getRequest();

		if (request.user && request.user.language) {
			return request.user.language;
		}

		const acceptLanguage = request.headers['accept-language'];
		if (acceptLanguage) {
			const parsedLang = acceptLanguage
				.split(',')[0]
				.split('-')[0]
				.toLowerCase();
			if (['fr', 'en'].includes(parsedLang)) {
				return parsedLang;
			}
		}

		return 'fr';
	},
);
