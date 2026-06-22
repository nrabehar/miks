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
	const configService = app.get(ConfigService);

	app.use(
		cookieParser.default(configService.get<string>('app.cookieSecret')),
	);

	const allowedOrigins = [
		'http://localhost:81',
		'http://localhost:3001',
		'http://localhost:5173',
		configService.get<string>('app.frontendUrl'),
	].filter(Boolean);

	app.enableCors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
				callback(new Error('Origin Not allowed by CORS'));
			}
		},
		methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
		credentials: true,
		maxAge: 86400,
	});

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
