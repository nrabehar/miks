import { PrismaClient } from '#prisma/client';
import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(PrismaService.name);

	constructor(private readonly config: ConfigService) {
		const adapter = new PrismaPg({
			connectionString: config.get<string>('database.url'),
		});

		super({ adapter, log: ['error', 'warn'], errorFormat: 'pretty' });
	}

	async onModuleInit() {
		try {
			this.logger.log('Connecting to the database...');
			await this.$connect();
			this.logger.log('Connected to the database');
		} catch (error) {
			this.logger.error(
				`Error connecting to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error instanceof Error ? error : new Error('Unknown error during database connection');
		}
	}

	async onModuleDestroy() {
		try {
			this.logger.log('Disconnecting from the database...');
			await this.$disconnect();
			this.logger.log('Disconnected from the database');
		} catch (error) {
			this.logger.error(
				`Error disconnecting from database: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error instanceof Error ? error : new Error('Unknown error during database disconnection');
		}
	}
}
