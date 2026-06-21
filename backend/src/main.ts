import { AllExceptionsFilter } from '#/core/filters/all-exception.filter';
import { HttpExceptionFilter } from '#/core/filters/http-exception.filter';
import { LoggingInterceptor } from '#/core/interceptors/logging.interceptor';
import { SanitizerInterceptor } from '#/core/interceptors/sanitizer.interceptor';
import { AppModule } from '@/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	);

	const configService = app.get(ConfigService);

	app.use(
		cookieParser.default(configService.get<string>('app.cookieSecret')),
	);

	// Global exception filters
	app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

	// Global interceptors
	app.useGlobalInterceptors(
		new SanitizerInterceptor(),
		new LoggingInterceptor(),
	);

	const port = configService.get<number>('app.port') ?? 3000;
	const host = configService.get<string>('app.host') ?? '127.0.0.1';

	await app.listen(port, host);
}
bootstrap();
