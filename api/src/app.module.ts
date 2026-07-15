import { ConfigModule } from '$lib/config/config.module';
import { PrismaModule } from '$lib/database/prisma.module';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { Module } from '@nestjs/common';

@Module({
	imports: [ConfigModule, PrismaModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
