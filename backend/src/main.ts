import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { bufferLogs: true });

	app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
	app.use(cookieParser());

	const config = app.get(ConfigService);

	const origins =
		config.get('app.corsOrigins') ||
		config.get('app.frontendUrl') ||
		'http://localhost:5173';
	app.enableCors({
		origin: origins,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	const port = config.get<number>('app.port') ?? 3000;
	await app.listen(port, '0.0.0.0');
	console.log(`MIKS API listening on :${port}`);
}

bootstrap();
