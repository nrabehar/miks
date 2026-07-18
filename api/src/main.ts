import { HttpExceptionFilter } from '$common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '$common/filters/prisma-exception.filter';
import { LoggingInterceptor } from '$common/interceptors/logging.interceptor';
import { TransformInterceptor } from '$common/interceptors/transform.interceptor';
import { ConfigService } from '$lib/config/config.service';
import { AppModule } from '@/app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const config = app.get(ConfigService);

	app.enableCors({
		origin: config.app.corsOrigins,
		credentials: true,
		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'X-Requested-With',
			'X-Device-Id',
		],
	});

	app.use(cookieParser());

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			exceptionFactory: (errors) =>
				new BadRequestException({
					message: errors.flatMap((error) =>
						Object.values(error.constraints ?? {}),
					),
				}),
		}),
	);

	app.useGlobalFilters(
		new PrismaExceptionFilter(),
		new HttpExceptionFilter(),
	);
	app.useGlobalInterceptors(
		new LoggingInterceptor(),
		new TransformInterceptor(),
	);

	await app.listen(config.app.port);
}

bootstrap();
