import { ConfigService } from '$lib/config/config.service';
import { PrismaClient } from '$prisma/client';
import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(PrismaService.name);

	constructor(config: ConfigService) {
		super({
			adapter: new PrismaPg({ connectionString: config.db.url }),
		});
	}

	async onModuleInit() {
		await this.$connect();
		try {
			await this.$queryRawUnsafe('SELECT 1');
			this.logger.log('Prisma Client connected');
		} catch (e) {
			this.logger.error('Prisma Client connection failed');
			throw e;
		}
	}

	async onModuleDestroy() {
		await this.$disconnect();
		this.logger.log('Prisma Client disconnected');
	}
}
